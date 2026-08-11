const technologyRules: Record<string, string> = {
  "package.json": "Node.js",
  "tsconfig.json": "TypeScript",
  "vite.config.ts": "Vite",
  "vite.config.js": "Vite",
  "Cargo.toml": "Rust",
  "tauri.conf.json": "Tauri",
};

export function detectTechnologies(files: string[]): string[] {
  const technologies = new Set<string>();

  for (const file of files) {
    const fileName = file.split("/").pop();

    if (!fileName) {
      continue;
    }

    const technology = technologyRules[fileName];

    if (technology) {
      technologies.add(technology);
    }
  }

  return Array.from(technologies);
}
