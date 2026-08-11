export interface ProjectUnderstanding {
  projectName: string;
  projectType: string;

  vision: string | null;
  goals: string[];
  features: string[];
  requirements: string[];
  architecture: string | null;
  roadmap: string | null;
  decisions: string[];
  technologies: string[];

  totalFiles: number;
}