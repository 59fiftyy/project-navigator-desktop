/**
 * Runtime abstraction the Atlas Engine depends on.
 *
 * The engine must never import Tauri (or any other runtime) directly.
 * Concrete implementations live in src/platform/*.
 */
export interface ProjectFileSystem {
  scanDirectory(path: string): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  /** Deletes a single file (never a directory). Optional for read-only runtimes. */
  deleteFile?(path: string): Promise<void>;
}
