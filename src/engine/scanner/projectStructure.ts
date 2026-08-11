export interface ProjectNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children: ProjectNode[];
}

export function buildProjectStructure(
  rootPath: string,
  files: string[]
): ProjectNode {
  const root: ProjectNode = {
    name: rootPath.split("/").filter(Boolean).pop() ?? "Project",
    path: rootPath,
    type: "directory",
    children: [],
  };

  for (const filePath of files) {
    if (!filePath.startsWith(rootPath)) {
      continue;
    }

    const relativePath = filePath
      .slice(rootPath.length)
      .replace(/^\/+/, "");

    if (!relativePath) {
      continue;
    }

    const parts = relativePath.split("/");
    let currentNode = root;
    let currentPath = rootPath;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (!part) {
        continue;
      }

      const isFile = i === parts.length - 1;

      currentPath = `${currentPath}/${part}`;

      let child = currentNode.children.find(
        (node) => node.name === part
      );

      if (!child) {
        child = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "directory",
          children: [],
        };

        currentNode.children.push(child);
      }

      currentNode = child;
    }

  }

  return root;
}