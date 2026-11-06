import { expect, it } from "vitest";
import { buildProjectStructure } from "@/engine/scanner/projectStructure";
import { allDirectoryPaths, hierarchyPositions } from "./structureModel";

it("retains every mixed-language file and folder in full project layout", () => {
  const files = ["/p/src/main.ts", "/p/src/tool.py", "/p/assets/logo.png", "/p/README.md"];
  const tree = buildProjectStructure("/p", files);
  const paths: string[] = [];
  const edges: { source: string; target: string }[] = [];
  const walk = (node: typeof tree) => {
    paths.push(node.path);
    for (const child of node.children) {
      edges.push({ source: node.path, target: child.path });
      walk(child);
    }
  };
  walk(tree);
  const positions = hierarchyPositions(paths, edges);
  expect(positions.map((node) => node.path).sort()).toEqual(paths.sort());
  for (const file of files) expect(positions.some((node) => node.path === file)).toBe(true);
  expect([...allDirectoryPaths(tree)].sort()).toEqual(["/p", "/p/assets", "/p/src"]);
  expect(new Set(positions.map((node) => `${node.x}:${node.y}`)).size).toBe(positions.length);
});
