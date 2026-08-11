import { readFile } from "../scanner/fileReader";
import type { ClassifiedFile } from "./types";

export interface DocumentationFile {
  path: string;
  name: string;
  purpose: string;
  content: string;
}

export async function readDocumentation(
  files: ClassifiedFile[]
): Promise<DocumentationFile[]> {
  const documentationFiles = files.filter(
    (file) => file.category === "documentation"
  );

  const results: DocumentationFile[] = [];

  for (const file of documentationFiles) {
    try {
      const content = await readFile(file.path);

      results.push({
        path: file.path,
        name: file.name,
        purpose: file.purpose,
        content,
      });
    } catch (error) {
      console.error(`Failed to read ${file.path}:`, error);
    }
  }

  return results;
}