import { Project, SourceFile } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

let cachedProject: Project | undefined;

/**
 * Get or create a ts-morph Project for the given workspace root.
 * Looks for tsconfig.json in the workspace; falls back to default compiler options.
 */
export function getProject(workspaceRoot: string): Project {
  if (cachedProject) {
    return cachedProject;
  }

  const tsconfigPath = findTsConfig(workspaceRoot);

  if (tsconfigPath) {
    cachedProject = new Project({
      tsConfigFilePath: tsconfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  } else {
    cachedProject = new Project({
      compilerOptions: {
        target: 99, // ESNext
        module: 99,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    });
    // Manually add all .ts/.tsx files
    cachedProject.addSourceFilesAtPaths(
      path.join(workspaceRoot, '**/*.{ts,tsx}')
    );
  }

  return cachedProject;
}

/**
 * Get or refresh a SourceFile by its file path.
 */
export function getSourceFile(
  project: Project,
  filePath: string
): SourceFile | undefined {
  let sourceFile = project.getSourceFile(filePath);

  if (!sourceFile) {
    // File might not be in the project yet — try adding it
    if (fs.existsSync(filePath)) {
      sourceFile = project.addSourceFileAtPath(filePath);
    }
  } else {
    // Refresh the file contents from disk
    sourceFile.refreshFromFileSystemSync();
  }

  return sourceFile;
}

/**
 * Create a lightweight Project for a single file (no workspace folder).
 * Uses the file's parent directory as a root and scans sibling .ts files.
 */
export function getProjectForSingleFile(filePath: string): Project {
  const dir = path.dirname(filePath);
  const tsconfigPath = findTsConfig(dir);

  let project: Project;
  if (tsconfigPath) {
    project = new Project({
      tsConfigFilePath: tsconfigPath,
      skipAddingFilesFromTsConfig: false,
    });
  } else {
    project = new Project({
      compilerOptions: {
        target: 99,
        module: 99,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    });
    // Add all .ts/.tsx files in the same directory tree
    project.addSourceFilesAtPaths(path.join(dir, '**/*.{ts,tsx}'));
  }

  // Ensure the target file is included
  if (!project.getSourceFile(filePath) && fs.existsSync(filePath)) {
    project.addSourceFileAtPath(filePath);
  }

  return project;
}

/**
 * Reset the cached project (e.g., when workspace changes).
 */
export function resetProject(): void {
  cachedProject = undefined;
}

/**
 * Walk up from workspaceRoot looking for tsconfig.json.
 */
function findTsConfig(workspaceRoot: string): string | undefined {
  const candidate = path.join(workspaceRoot, 'tsconfig.json');
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  return undefined;
}
