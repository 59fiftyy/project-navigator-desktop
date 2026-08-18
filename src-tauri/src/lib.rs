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

fn run_git(args: &[&str], cwd: Option<&str>) -> Result<GitOutput, String> {
    let mut command = std::process::Command::new("git");
    command.args(args);

    if let Some(dir) = cwd {
        command.current_dir(dir);
    }

    let output = command
        .output()
        .map_err(|error| format!("Failed to run git: {error}. Is Git installed?"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(GitOutput { stdout, stderr })
    } else {
        Err(if stderr.trim().is_empty() {
            stdout
        } else {
            stderr
        })
    }
}

/// True when `path` is inside (or is) a Git working tree.
#[tauri::command]
fn git_is_repository(path: String) -> Result<bool, String> {
    if !Path::new(&path).is_dir() {
        return Ok(false);
    }

    match run_git(&["rev-parse", "--is-inside-work-tree"], Some(&path)) {
        Ok(output) => Ok(output.stdout.trim() == "true"),
        Err(_) => Ok(false),
    }
}

/// Short status/branch/remote summary for a repository.
#[tauri::command]
fn git_status(path: String) -> Result<GitOutput, String> {
    run_git(&["status", "--porcelain=v1", "--branch"], Some(&path))
}

/// Configured origin remote URL, when present.
#[tauri::command]
fn git_remote_url(path: String) -> Result<String, String> {
    match run_git(&["remote", "get-url", "origin"], Some(&path)) {
        Ok(output) => Ok(output.stdout.trim().to_string()),
        Err(_) => Ok(String::new()),
    }
}

/// Clones `url` into `destination`, optionally under `folder_name`.
#[tauri::command]
fn git_clone(url: String, destination: String, folder_name: Option<String>) -> Result<String, String> {
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

    if target.exists() {
        return Err(format!("Target folder already exists: {}", target.display()));
    }

    let target_string = target.to_string_lossy().to_string();

    run_git(&["clone", url.as_str(), target_string.as_str()], None)?;

    Ok(target_string.replace('\\', "/"))
}

/// Pulls from the configured remote. Refuses to run when the working tree is dirty.
#[tauri::command]
fn git_pull(path: String) -> Result<String, String> {
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
