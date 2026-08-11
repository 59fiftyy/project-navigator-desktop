import type { ClassifiedFile } from "./types";
import type { ProjectFileSystem } from "../../platform/projectFileSystem";

export interface DocumentationFile {
  path: string;
  name: string;
  purpose: string;
  content: string;
}

export async function readDocumentation(
  files: ClassifiedFile[],
  fs: ProjectFileSystem,
): Promise<DocumentationFile[]> {
  const documentationFiles = files.filter((file) => file.category === "documentation");

  const results: DocumentationFile[] = [];

  for (const file of documentationFiles) {
    try {
      const content = await fs.readFile(file.path);

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
