use std::fs;
use std::path::Path;

use walkdir::WalkDir;

/// Directories that are never useful for project analysis and would otherwise
/// dominate the scan.
const IGNORED_DIRS: &[&str] = &[
    "node_modules",
    ".git",
    "target",
    "dist",
    "build",
    ".next",
    ".turbo",
    ".cache",
    ".venv",
    "venv",
    "__pycache__",
    ".idea",
    ".svelte-kit",
    "vendor",
    "Pods",
    ".DS_Store",
];

/// Upper bound so a mistakenly selected home directory can't hang the app.
const MAX_FILES: usize = 60_000;
const MAX_DEPTH: usize = 24;

/// Maximum size of a file Atlas will read into memory (2 MB).
const MAX_FILE_BYTES: u64 = 2 * 1024 * 1024;

fn is_ignored(name: &str) -> bool {
    IGNORED_DIRS.contains(&name)
}

/// Recursively lists every file under `path`, using forward slashes so the
/// engine's path handling stays platform-independent.
#[tauri::command]
fn scan_directory(path: String) -> Result<Vec<String>, String> {
    let root = Path::new(&path);

    if !root.exists() {
        return Err(format!("Path does not exist: {path}"));
    }

    if !root.is_dir() {
        return Err(format!("Path is not a directory: {path}"));
    }

    let mut files: Vec<String> = Vec::new();

    let walker = WalkDir::new(root)
        .max_depth(MAX_DEPTH)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            if entry.depth() == 0 {
                return true;
            }

            let name = entry.file_name().to_string_lossy();

            if entry.file_type().is_dir() {
                !is_ignored(name.as_ref())
            } else {
                true
            }
        });

    for entry in walker {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };

        if !entry.file_type().is_file() {
            continue;
        }

        files.push(entry.path().to_string_lossy().replace('\\', "/"));

        if files.len() >= MAX_FILES {
            break;
        }
    }

    Ok(files)
}

/// Reads a UTF-8 text file from disk.
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let file_path = Path::new(&path);

    let metadata = fs::metadata(file_path).map_err(|error| format!("{path}: {error}"))?;

    if !metadata.is_file() {
        return Err(format!("Not a file: {path}"));
    }

    if metadata.len() > MAX_FILE_BYTES {
        return Err(format!("File too large to read: {path}"));
    }

    fs::read_to_string(file_path).map_err(|error| format!("{path}: {error}"))
}

/// Writes a UTF-8 text file to disk, creating parent directories when needed.
#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("{path}: {error}"))?;
    }

    fs::write(file_path, content).map_err(|error| format!("{path}: {error}"))
}

/// Result of a Git command execution.
#[derive(serde::Serialize)]
pub struct GitOutput {
    pub stdout: String,
    pub stderr: String,
}

/// Safety net against hung Git processes (credential prompts, dead remotes).
/// Generous on purpose — it is not meant to cut off legitimate long clones.
/// Adjust here; every Git command shares this value.
const GIT_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(300);

/// How often the blocking task checks whether Git has finished.
const GIT_POLL_INTERVAL: std::time::Duration = std::time::Duration::from_millis(50);

/// Spawns `git` with all interactive prompting disabled and waits for it with a
/// timeout. Runs on a blocking worker thread — never on the Tauri main thread.
///
/// stdout and stderr are drained by dedicated threads *while* Git runs. Draining
/// only after exit deadlocks: `git clone` writes progress to stderr, fills the
/// OS pipe buffer, and then blocks forever waiting for a reader that never comes
/// until it exits — which it never does.
fn run_git(args: &[&str], cwd: Option<&str>) -> Result<GitOutput, String> {
    use std::io::Read;
    use std::process::{Command, Stdio};

    let mut command = Command::new("git");

    // Never let Git try to ask the user for anything: there is no terminal
    // attached to the app, so a prompt would hang the operation forever.
    command
        .arg("-c")
        .arg("credential.helper=")
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GIT_ASKPASS", "")
        .env("SSH_ASKPASS", "")
        .env("GCM_INTERACTIVE", "never")
        .env("GIT_SSH_COMMAND", "ssh -oBatchMode=yes -oStrictHostKeyChecking=accept-new")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(dir) = cwd {
        command.current_dir(dir);
    }

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to run git: {error}. Is Git installed?"))?;

    // Drain both pipes concurrently so Git can never block on a full buffer.
    let mut stdout_pipe = child.stdout.take();
    let mut stderr_pipe = child.stderr.take();

    let stdout_reader = std::thread::spawn(move || {
        let mut buffer = Vec::new();

        if let Some(pipe) = stdout_pipe.as_mut() {
            let _ = pipe.read_to_end(&mut buffer);
        }

        String::from_utf8_lossy(&buffer).to_string()
    });

    let stderr_reader = std::thread::spawn(move || {
        let mut buffer = Vec::new();

        if let Some(pipe) = stderr_pipe.as_mut() {
            let _ = pipe.read_to_end(&mut buffer);
        }

        String::from_utf8_lossy(&buffer).to_string()
    });

    let started = std::time::Instant::now();
    let mut timed_out = false;

    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {
                if started.elapsed() >= GIT_TIMEOUT {
                    let _ = child.kill();
                    timed_out = true;
                    break child.wait().map_err(|error| format!("Failed to wait for git: {error}"))?;
                }

                std::thread::sleep(GIT_POLL_INTERVAL);
            }
            Err(error) => return Err(format!("Failed to wait for git: {error}")),
        }
    };

    // The readers finish as soon as the pipes close, which happens when the
    // child exits or is killed.
    let stdout = stdout_reader.join().unwrap_or_default();
    let stderr = stderr_reader.join().unwrap_or_default();

    if timed_out {
        return Err(
            "The Git operation timed out and was stopped. It may need credentials, or the remote is unreachable."
                .to_string(),
        );
    }

    if status.success() {
        Ok(GitOutput { stdout, stderr })
    } else {
        Err(if stderr.trim().is_empty() {
            stdout
        } else {
            stderr
        })
    }
}

/// Runs a Git operation on a blocking worker thread so the UI event loop keeps
/// running while Git works.
async fn git_task<T, F>(work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(work)
        .await
        .map_err(|error| format!("Git task failed to run: {error}"))?
}

/// True when `path` is inside (or is) a Git working tree.
#[tauri::command]
async fn git_is_repository(path: String) -> Result<bool, String> {
    git_task(move || {
        if !Path::new(&path).is_dir() {
            return Ok(false);
        }

        match run_git(&["rev-parse", "--is-inside-work-tree"], Some(&path)) {
            Ok(output) => Ok(output.stdout.trim() == "true"),
            Err(_) => Ok(false),
        }
    })
    .await
}

/// Short status/branch/remote summary for a repository.
#[tauri::command]
async fn git_status(path: String) -> Result<GitOutput, String> {
    git_task(move || run_git(&["status", "--porcelain=v1", "--branch"], Some(&path))).await
}

/// Configured origin remote URL, when present.
#[tauri::command]
async fn git_remote_url(path: String) -> Result<String, String> {
    git_task(move || match run_git(&["remote", "get-url", "origin"], Some(&path)) {
        Ok(output) => Ok(output.stdout.trim().to_string()),
        Err(_) => Ok(String::new()),
    })
    .await
}

/// True when `path` looks like a clone Atlas started but never finished.
fn is_incomplete_clone(path: &Path) -> bool {
    if path.join(".git").exists() {
        return false;
    }

    match fs::read_dir(path) {
        Ok(mut entries) => entries.next().is_none() || true,
        Err(_) => false,
    }
}

/// Clones `url` into `destination`, optionally under `folder_name`.
#[tauri::command]
async fn git_clone(
    url: String,
    destination: String,
    folder_name: Option<String>,
) -> Result<String, String> {
    git_task(move || {
        let root = Path::new(&destination);

        if !root.is_dir() {
            return Err(format!("Destination is not a directory: {destination}"));
        }

        let name = folder_name
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| {
                url.trim_end_matches('/')
                    .rsplit('/')
                    .next()
                    .unwrap_or("repository")
                    .trim_end_matches(".git")
                    .to_string()
            });

        if name.contains('/') || name.contains('\\') || name == ".." {
            return Err(format!("Invalid folder name: {name}"));
        }

        let target = root.join(&name);

        // Atlas never touches a folder that already existed.
        if target.exists() {
            return Err(format!("Target folder already exists: {}", target.display()));
        }

        let target_string = target.to_string_lossy().to_string();

        match run_git(&["clone", url.as_str(), target_string.as_str()], None) {
            Ok(_) => Ok(target_string.replace('\\', "/")),
            Err(error) => {
                // Git creates the target folder before it contacts the remote, so a
                // failed or timed-out clone can leave an unusable directory behind.
                // It was created by this call, so removing it is safe.
                let mut message = error;

                if target.exists() && is_incomplete_clone(&target) {
                    match fs::remove_dir_all(&target) {
                        Ok(()) => {
                            message.push_str("\n\nThe incomplete folder was removed.");
                        }
                        Err(remove_error) => {
                            message.push_str(&format!(
                                "\n\nAn incomplete folder remains at {} and could not be removed: {remove_error}",
                                target.display()
                            ));
                        }
                    }
                }

                Err(message)
            }
        }
    })
    .await
}

/// Pulls from the configured remote. Refuses to run when the working tree is dirty.
#[tauri::command]
async fn git_pull(path: String) -> Result<String, String> {
    git_task(move || {
        let status = run_git(&["status", "--porcelain"], Some(&path))?;

        if !status.stdout.trim().is_empty() {
            return Err(
                "This repository has uncommitted local changes. Commit or stash them before updating."
                    .to_string(),
            );
        }

        let output = run_git(&["pull", "--ff-only"], Some(&path))?;

        Ok(if output.stdout.trim().is_empty() {
            output.stderr
        } else {
            output.stdout
        })
    })
    .await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            read_file,
            write_file,
            git_is_repository,
            git_status,
            git_remote_url,
            git_clone,
            git_pull
        ])
        .run(tauri::generate_context!())
        .expect("error while running Atlas");
}
