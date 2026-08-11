import type { ProjectFile } from "../scanner/types";
import type { ClassifiedFile, FileCategory } from "./types";

const documentationFiles: Record<string, string> = {
  "README.md": "Project documentation",
  "Vision.md": "Project vision",
  "PRD.md": "Product requirements",
  "Roadmap.md": "Project roadmap",
  "Features.md": "Feature definitions",
  "Architecture.md": "System architecture",
  "Database.md": "Database documentation",
  "DataModel.md": "Data model documentation",
  "UI.md": "User interface documentation",
  "ADR.md": "Architecture decision records",
  "MVP.md": "Minimum viable product definition",
  "Tech Stack.md": "Technology stack documentation",
  "ProjectMetadata.md": "Project metadata",
  "Colors.md": "Design color system",
  "Typography.md": "Design typography system",
  "Spacing.md": "Design spacing system",
  "Components.md": "Design component system",
};

const configurationFiles = [
  "package.json",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "tauri.conf.json",
  "Cargo.toml",
  ".gitignore",
];

function classifyFile(file: ProjectFile): ClassifiedFile {
  const documentationPurpose = documentationFiles[file.name];

  if (documentationPurpose) {
    return {
      ...file,
      category: "documentation",
      purpose: documentationPurpose,
    };
  }

  if (configurationFiles.includes(file.name)) {
    return {
      ...file,
      category: "configuration",
      purpose: "Project configuration",
    };
  }

  if (
    file.name.endsWith(".test.ts") ||
    file.name.endsWith(".test.tsx") ||
    file.name.endsWith(".spec.ts") ||
    file.name.endsWith(".spec.tsx")
  ) {
    return {
      ...file,
      category: "test",
      purpose: "Test file",
    };
  }

  if (["ts", "tsx", "js", "jsx", "rs", "py", "css", "html"].includes(file.extension)) {
    return {
      ...file,
      category: "source",
      purpose: "Source code",
    };
  }

  if (["png", "jpg", "jpeg", "svg", "webp", "ico", "icns"].includes(file.extension)) {
    return {
      ...file,
      category: "asset",
      purpose: "Project asset",
    };
  }

  if (file.name === "package-lock.json" || file.name === "Cargo.lock") {
    return {
      ...file,
      category: "dependency",
      purpose: "Dependency lock file",
    };
  }

  const category: FileCategory = "unknown";

  return {
    ...file,
    category,
    purpose: "Unknown",
  };
}

export function classifyFiles(files: ProjectFile[]): ClassifiedFile[] {
  return files.map(classifyFile);
}
