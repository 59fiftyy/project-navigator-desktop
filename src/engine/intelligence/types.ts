export type FileCategory =
  "documentation" | "configuration" | "source" | "test" | "asset" | "dependency" | "unknown";

export interface ClassifiedFile {
  path: string;
  name: string;
  extension: string;
  category: FileCategory;
  purpose: string;
}
