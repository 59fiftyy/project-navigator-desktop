import { describe, expect, it } from "vitest";

import type { ProjectContext } from "@/engine";
import { resolveDocuments, targetPath } from "./documentation";
import { buildContextBrief, estimateTokens } from "./contextBrief";
import { readTheme } from "./theme";

function context(docs: { path: string; name: string; content: string }[]): ProjectContext {
  return {
    project: { name: "demo", path: "/p", files: [], technologies: [], structure: {} },
    analysis: { projectType: "Web app", technologies: ["React"], totalFiles: 3 },
    knowledge: { documentation: { files: docs } },
  } as unknown as ProjectContext;
}

describe("documentation rules", () => {
  it("lists README.md last", () => {
    const docs = resolveDocuments(context([]));
    expect(docs[docs.length - 1]?.section.fileName).toBe("README.md");
  });

  it("creates new docs in the Atlas folder, README at the root", () => {
    const ctx = context([]);
    const docs = resolveDocuments(ctx);
    const vision = docs.find((d) => d.section.id === "vision")!;
    const readme = docs.find((d) => d.section.id === "readme")!;
    expect(targetPath(ctx, vision)).toBe("/p/Atlas/Vision.md");
    expect(targetPath(ctx, readme)).toBe("/p/README.md");
  });

  it("keeps an existing doc where it is", () => {
    const ctx = context([{ path: "/p/docs/Vision.md", name: "Vision.md", content: "x" }]);
    const vision = resolveDocuments(ctx).find((d) => d.section.id === "vision")!;
    expect(targetPath(ctx, vision)).toBe("/p/docs/Vision.md");
  });
});

describe("brief", () => {
  it("estimates about 4 characters per token", () => {
    expect(estimateTokens("abcdefgh")).toBe(2);
  });

  it("includes existing docs and skips missing ones", () => {
    const ctx = context([{ path: "/p/Vision.md", name: "Vision.md", content: "Our vision" }]);
    const brief = buildContextBrief(ctx, resolveDocuments(ctx));
    expect(brief).toContain("## Vision.md");
    expect(brief).toContain("Our vision");
    expect(brief).not.toContain("## Goals.md");
  });
});

describe("theme", () => {
  it("defaults to dark", () => {
    expect(readTheme({ getItem: () => null })).toBe("dark");
    expect(readTheme({ getItem: () => "light" })).toBe("light");
  });
});
