import ts from "typescript";
import type { ProjectFileSystem } from "@/platform/projectFileSystem";
import type { ProjectInfo } from "../scanner/types";
import { countLines, languageOf } from "@/app/dashboardInsights";
import type { CodeIntelligence, DependencyEdge, DependencyIssue } from "./types";

export const normalizePath = (path: string) => {
  const pieces: string[] = [];
  const normalized = path.replace(/\\/g, "/");
  for (const piece of normalized.split("/")) {
    if (piece === "..") pieces.pop();
    else if (piece && piece !== ".") pieces.push(piece);
  }
  return `${normalized.startsWith("/") ? "/" : ""}${pieces.join("/")}`;
};

const JS_SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/i;
const isEntry = (path: string) =>
  /(?:^|\/)(?:main|index|app|entry|cli)\.[cm]?[jt]sx?$/i.test(path) ||
  /(?:^|\/)(?:pages|routes|tests?|__tests__|e2e|scripts)\//i.test(path) ||
  /(?:\.config\.|\.(?:test|spec)\.|\.d\.[cm]?ts$)/i.test(path);

/** Static imports, re-exports, require and literal import(); no regex parsing of code. */
export function extractImports(path: string, text: string) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const specifiers = new Set<string>();
  let dynamic = false;
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.add(node.moduleSpecifier.text);
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      specifiers.add(node.moduleReference.expression.text);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteralLike(argument)) specifiers.add(argument.text);
      else dynamic = true;
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    )
      specifiers.add(node.argument.literal.text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { specifiers: [...specifiers], dynamic };
}

/** One bounded source-read pass per explicit analysis, also producing deterministic LOC. */
export async function scanCodeIntelligence(
  project: ProjectInfo,
  fs: ProjectFileSystem,
): Promise<CodeIntelligence> {
  const paths = new Set(project.files.map((file) => normalizePath(file.path)));
  const root = normalizePath(project.path);
  const configTexts = new Map<string, string>();
  const configurations = project.files.filter(
    (file) => /^(?:tsconfig|jsconfig).*\.json$/i.test(file.name) || file.name === "package.json",
  );
  for (const file of configurations) {
    try {
      configTexts.set(normalizePath(file.path), await fs.readFile(file.path));
    } catch {
      /* optional config */
    }
  }
  const host: ts.ModuleResolutionHost = {
    fileExists: (path) => paths.has(normalizePath(path)),
    readFile: (path) => configTexts.get(normalizePath(path)),
    directoryExists: (path) => directories.has(normalizePath(path)),
    getCurrentDirectory: () => root,
  };
  const directories = new Set<string>();
  for (const path of paths) {
    let directory = path.slice(0, path.lastIndexOf("/"));
    while (directory) {
      directories.add(directory);
      const parent = directory.slice(0, directory.lastIndexOf("/"));
      if (parent === directory) break;
      directory = parent;
    }
  }
  const defaults: ts.CompilerOptions = {
    allowJs: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
  };
  const configs = [...configTexts]
    .filter(([path]) => /\/(?:tsconfig|jsconfig)\.json$/i.test(path))
    .map(([path, text]) => {
      const directory = path.slice(0, path.lastIndexOf("/"));
      const json = ts.parseConfigFileTextToJson(path, text);
      const parsed = ts.parseJsonConfigFileContent(
        json.config ?? {},
        {
          useCaseSensitiveFileNames: true,
          fileExists: host.fileExists,
          readFile: host.readFile,
          readDirectory: () => [],
        },
        directory,
        defaults,
        path,
      );
      return { directory, options: parsed.options };
    })
    .sort((a, b) => b.directory.length - a.directory.length);
  const optionsFor = (path: string) =>
    configs.find((config) => path.startsWith(`${config.directory}/`))?.options ?? defaults;
  const caches = new Map<ts.CompilerOptions, ts.ModuleResolutionCache>();
  const internal = project.files
    .filter((file) => JS_SOURCE.test(file.path))
    .map((file) => normalizePath(file.path));
  const internalSet = new Set(internal);
  const edges = new Map<string, DependencyEdge>();
  const issues: DependencyIssue[] = [];
  let linesOfCode = 0;
  let unreadableSourceFiles = 0;
  const code = project.files.filter((file) => languageOf(file.extension));
  let index = 0;
  const worker = async () => {
    while (index < code.length) {
      const file = code[index++];
      if (!file) break;
      const path = normalizePath(file.path);
      let text: string;
      try {
        text = await fs.readFile(file.path);
      } catch {
        unreadableSourceFiles++;
        issues.push({ path, specifier: "", kind: "unreadable" });
        continue;
      }
      // Never capture an accumulator before awaiting: addition is synchronous.
      linesOfCode += countLines(text);
      if (internalSet.has(path)) {
        const imports = extractImports(path, text);
        if (imports.dynamic) issues.push({ path, specifier: "computed import", kind: "dynamic" });
        const options = optionsFor(path);
        let cache = caches.get(options);
        if (!cache) {
          cache = ts.createModuleResolutionCache(root, (p) => p, options);
          caches.set(options, cache);
        }
        for (const specifier of imports.specifiers) {
          const resolved = ts.resolveModuleName(
            specifier,
            path,
            options,
            host,
            cache,
          ).resolvedModule;
          const target = resolved ? normalizePath(resolved.resolvedFileName) : undefined;
          if (target && internalSet.has(target))
            edges.set(`${path}\0${target}`, { source: path, target });
          else if (
            !resolved &&
            (specifier.startsWith(".") ||
              specifier.startsWith("/") ||
              Object.keys(options.paths ?? {}).some((pattern) =>
                specifier.startsWith(pattern.split("*")[0] ?? pattern),
              ))
          ) {
            issues.push({ path, specifier, kind: "unresolved" });
          }
        }
      }
      // Yield after each file so parsing does not monopolize the desktop UI.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  const sortedEdges = [...edges.values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target),
  );
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  for (const edge of sortedEdges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1);
  }
  return {
    nodes: internal
      .sort()
      .map((path) => ({
        path,
        incoming: incoming.get(path) ?? 0,
        outgoing: outgoing.get(path) ?? 0,
        entryPoint: isEntry(path),
      })),
    edges: sortedEdges,
    issues: issues.sort(
      (a, b) => a.path.localeCompare(b.path) || a.specifier.localeCompare(b.specifier),
    ),
    unsupportedFiles: code.length - internal.length,
    linesOfCode,
    unreadableSourceFiles,
  };
}

export { impactedFiles, potentialOrphans } from "./graph";
