import { scanProject } from "./scanner/scanner";
import { analyzeProject } from "./analyzer/projectAnalyzer";
import { classifyFiles } from "./intelligence/fileClassifier";
import { buildProjectKnowledge } from "./knowledge/projectKnowledge";
import {
  buildProjectContextBase,
  buildProjectContext,
} from "./context/projectContext";
import { understandProject } from "./understanding/projectUnderstanding";

export async function loadProject(path: string) {
  // 1. Scan
  const project = await scanProject(path);

  // 2. Analyze
  const analysis = analyzeProject(project);

  // 3. Classify files
  const classifiedFiles = classifyFiles(project.files);

  // 4. Build project knowledge
  const knowledge = await buildProjectKnowledge(
    project,
    classifiedFiles
  );

  // 5. Build base context
  const baseContext = buildProjectContextBase(
    project,
    analysis,
    knowledge
  );

  // 6. Understand the project
  const understanding = understandProject(baseContext);

  // 7. Build complete project context
  const context = buildProjectContext(
    baseContext,
    understanding
  );

  return context;
}

export { scanProject };
export { analyzeProject };
export { classifyFiles };
export { buildProjectKnowledge };
export { buildProjectContext };
export { buildProjectContextBase };
export { understandProject };