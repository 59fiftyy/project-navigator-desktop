import { describe, expect, it } from "vitest";
import {
  extractImports,
  impactedFiles,
  potentialOrphans,
  scanCodeIntelligence,
} from "./dependencyScanner";
import type { ProjectFileSystem } from "@/platform/projectFileSystem";
import type { ProjectInfo } from "../scanner/types";

function fixture(contents: Record<string, string>, root = "/p") {
  const project: ProjectInfo = {
    name: "fixture",
    path: root,
    technologies: [],
    structure: { path: root, name: "fixture", type: "directory", children: [] },
    files: Object.keys(contents).map((path) => ({
      path,
      name: path.split("/").pop() ?? path,
      extension: path.split(".").pop() ?? "",
    })),
  };
  const fs: ProjectFileSystem = {
    scanDirectory: async () => Object.keys(contents),
    readFile: async (path) => {
      await new Promise((resolve) => setTimeout(resolve, path.length % 5));
      const text = contents[path];
      if (text === undefined) throw new Error("unreadable");
      return text;
    },
    writeFile: async () => {
      throw new Error("not used");
    },
  };
  return { project, fs };
}

describe("dependency intelligence", () => {
  it("parses imports, re-exports and require without treating comments and strings as imports", () => {
    const result = extractImports(
      "/p/a.ts",
      `// import './false';
const s = "require('./false')";
import type { X } from './types';
export * from './shared';
const x = require('./cjs');
import('./lazy');
import(variable);
`,
    );
    expect(result.specifiers).toEqual(["./types", "./shared", "./cjs", "./lazy"]);
    expect(result.dynamic).toBe(true);
  });

  it("resolves aliases, relative JS substitution and index paths; excludes external packages", async () => {
    const { project, fs } = fixture({
      "/p/tsconfig.json": '{"compilerOptions":{"baseUrl":".","paths":{"@/*":["src/*"]}}}',
      "/p/src/main.ts": "import '@/shared'; import './folder'; import './util.js'; import 'react';",
      "/p/src/shared.ts": "export const x = 1;",
      "/p/src/folder/index.ts": "export const y = 1;",
      "/p/src/util.ts": "export const z = 1;",
    });
    const result = await scanCodeIntelligence(project, fs);
    expect(result.edges.map((edge) => edge.target).sort()).toEqual([
      "/p/src/folder/index.ts",
      "/p/src/shared.ts",
      "/p/src/util.ts",
    ]);
    expect(result.issues).toHaveLength(0);
  });

  it("counts all non-empty source lines deterministically despite overlapping reads", async () => {
    const contents = Object.fromEntries(
      Array.from({ length: 18 }, (_, index) => [
        `/p/f${index}.ts`,
        "const a = 1;\n\nconst b = 2;\n",
      ]),
    );
    const { project, fs } = fixture(contents);
    for (let run = 0; run < 3; run++)
      expect((await scanCodeIntelligence(project, fs)).linesOfCode).toBe(36);
  });

  it("reports read failures as partial LOC instead of silently claiming a complete number", async () => {
    const { project, fs } = fixture({ "/p/a.ts": "const a = 1;" });
    project.files.push({ path: "/p/unreadable.ts", name: "unreadable.ts", extension: "ts" });
    const result = await scanCodeIntelligence(project, fs);
    expect(result.linesOfCode).toBe(1);
    expect(result.unreadableSourceFiles).toBe(1);
    expect(result.issues).toContainEqual({
      path: "/p/unreadable.ts",
      specifier: "",
      kind: "unreadable",
    });
  });

  it("traverses transitive impact safely through cycles", () => {
    const edges = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "b" },
      { source: "other", target: "x" },
    ];
    expect([...impactedFiles(edges, "c")].sort()).toEqual(["a", "b"]);
  });

  it("excludes known entry points and unreadable files from potential orphans", async () => {
    const { project, fs } = fixture({
      "/p/main.ts": "",
      "/p/routes/page.ts": "",
      "/p/util.ts": "",
    });
    const result = await scanCodeIntelligence(project, fs);
    expect(potentialOrphans(result).map((node) => node.path)).toEqual(["/p/util.ts"]);
  });

  it("resolves Windows project paths and aliases", async () => {
    const { project, fs } = fixture(
      {
        "C:/p/tsconfig.json": '{"compilerOptions":{"paths":{"@/*":["./src/*"]}}}',
        "C:/p/src/a.ts": "import '@/b';",
        "C:/p/src/b.ts": "export const b = 1;",
      },
      "C:/p",
    );
    expect((await scanCodeIntelligence(project, fs)).edges).toEqual([
      { source: "C:/p/src/a.ts", target: "C:/p/src/b.ts" },
    ]);
  });
});
