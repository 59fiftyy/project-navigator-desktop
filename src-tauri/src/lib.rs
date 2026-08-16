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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![scan_directory, read_file, write_file])
        .run(tauri::generate_context!())
        .expect("error while running Atlas");
}
