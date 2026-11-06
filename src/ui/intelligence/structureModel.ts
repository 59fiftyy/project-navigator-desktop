import type { ProjectNode } from "@/engine";

export function allDirectoryPaths(root: ProjectNode): Set<string> {
  const paths = new Set<string>();
  const walk = (node: ProjectNode) => {
    if (node.type !== "directory") return;
    paths.add(node.path);
    node.children.forEach(walk);
  };
  walk(root);
  return paths;
}

/** Linear-time tidy hierarchy layout, independent of React and the filesystem. */
export function hierarchyPositions(paths: string[], edges: { source: string; target: string }[]) {
  const children = new Map<string, string[]>();
  const hasParent = new Set<string>();
  for (const { source, target } of edges) {
    const list = children.get(source) ?? [];
    list.push(target);
    children.set(source, list);
    hasParent.add(target);
  }
  let row = 0;
  const positions: { path: string; x: number; y: number }[] = [];
  const walk = (path: string, depth: number): number => {
    const items = children.get(path) ?? [];
    const start = row;
    let y: number;
    if (!items.length) y = row++ * 86;
    else {
      let first = 0;
      let last = 0;
      items.forEach((child, index) => {
        const childY = walk(child, depth + 1);
        if (index === 0) first = childY;
        last = childY;
      });
      y = (first + last) / 2;
    }
    positions.push({ path, x: depth * 320, y });
    if (row === start) row++;
    return y;
  };
  paths.filter((path) => !hasParent.has(path)).forEach((path) => walk(path, 0));
  return positions;
}
