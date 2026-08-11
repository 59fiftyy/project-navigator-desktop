import type { ClassifiedFile } from "../intelligence/types";

export interface ProjectAnalysis {
  projectType: string;
  description: string;
  technologies: string[];
  totalFiles: number;
  importantFiles: string[];
  directories: string[];
  classifiedFiles: ClassifiedFile[];
}
