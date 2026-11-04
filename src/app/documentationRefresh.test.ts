import { describe, expect, it } from "vitest";
import { loadProject, refreshProjectDocumentation } from "@/engine";
import type { ProjectFileSystem } from "@/platform/projectFileSystem";
import { resolveDocuments } from "./documentation";

describe("real documentation refresh", () => {
  it("reads a newly written custom Atlas doc without scanning or rereading source; preserves intelligence", async () => {
    const disk = new Map([["/p/main.ts", "const a = 1;\n"], ["/p/README.md", "# Project\n"]]);
    let scans = 0;
    const reads: string[] = [];
    const fs: ProjectFileSystem = {
      scanDirectory: async () => { scans++; return [...disk.keys()]; },
      readFile: async (path) => { reads.push(path); const text = disk.get(path); if (text === undefined) throw new Error("missing"); return text; },
      writeFile: async (path, text) => { disk.set(path, text); },
    };
    const initial = await loadProject("/p", fs);
    reads.length = 0;
    await fs.writeFile("/p/Atlas/Research.md", "# Research\nActual notes\n");
    const next = await refreshProjectDocumentation(initial, fs, "/p/Atlas/Research.md");
    const docs = resolveDocuments(next);
    expect(docs.find((doc) => doc.section.fileName === "Research.md")?.content).toBe("# Research\nActual notes\n");
    expect(docs.at(-1)?.section.fileName).toBe("README.md");
    expect(scans).toBe(1);
    expect(reads).not.toContain("/p/main.ts");
    expect(next.codeIntelligence).toBe(initial.codeIntelligence);
    await fs.writeFile("/p/Atlas/Research.md", "# Research\nEdited notes\n");
    const edited = await refreshProjectDocumentation(next, fs, "/p/Atlas/Research.md");
    expect(resolveDocuments(edited).find((doc) => doc.section.fileName === "Research.md")?.content).toContain("Edited notes");
  });
});