/**
 * Workspace-aware path abstraction for qml-ng.
 *
 * This module replaces raw `node:path` usage with workspace-aware concepts
 * that understand Angular project structure, target projects, feature folders,
 * and component placement.
 *
 * Node path helpers are isolated to thin boundary adapters.
 */

/**
 * Represents a location within an Angular workspace
 */
export interface WorkspaceLocation {
  /** The Angular project name (e.g., 'app', 'my-lib') */
  project: string;
  /** Feature path within the project (e.g., 'features/auth', 'shared/components') */
  featurePath?: string;
  /** Component name (e.g., 'login', 'user-profile') */
  componentName?: string;
}

/**
 * Represents the structure of an Angular workspace
 */
export interface WorkspaceStructure {
  /** Root directory of the workspace */
  root: string;
  /** Map of project names to their source roots */
  projects: Map<string, ProjectInfo>;
  /** Default project to use when none is specified */
  defaultProject?: string;
}

/**
 * Information about an Angular project within a workspace
 */
export interface ProjectInfo {
  /** Project type (application or library) */
  type: 'application' | 'library';
  /** Source root path relative to workspace root (e.g., 'src', 'projects/my-lib/src') */
  sourceRoot: string;
  /** Root path relative to workspace root (e.g., '', 'projects/my-lib') */
  root: string;
}

/**
 * Represents a component's file structure within the workspace
 */
export interface ComponentFiles {
  /** TypeScript file path (workspace-relative) */
  typescript: string;
  /** HTML template file path (workspace-relative) */
  template: string;
  /** SCSS style file path (workspace-relative) */
  style: string;
  /** Containing directory (workspace-relative) */
  directory: string;
}

/**
 * Workspace-aware path resolver
 *
 * This class understands Angular workspace structure and resolves paths
 * according to Angular conventions rather than treating them as raw strings.
 */
export class WorkspacePathResolver {
  constructor(private workspace: WorkspaceStructure) {}

  /**
   * Resolve a workspace location to component file paths
   */
  resolveComponentFiles(location: WorkspaceLocation): ComponentFiles {
    const project = this.getProject(location.project);
    const componentPath = this.buildComponentPath(project, location);

    return {
      typescript: `${componentPath}/${location.componentName}.component.ts`,
      template: `${componentPath}/${location.componentName}.component.html`,
      style: `${componentPath}/${location.componentName}.component.scss`,
      directory: componentPath,
    };
  }

  /**
   * Resolve a feature path within a project
   */
  resolveFeaturePath(projectName: string, featurePath?: string): string {
    const project = this.getProject(projectName);
    const base = project.sourceRoot;

    if (!featurePath) {
      return base;
    }

    // Use posix-style path joining for workspace paths
    return this.joinWorkspacePath(base, featurePath);
  }

  /**
   * Get project info or throw if not found
   */
  private getProject(projectName: string): ProjectInfo {
    const project = this.workspace.projects.get(projectName);
    if (!project) {
      throw new Error(`Project "${projectName}" not found in workspace`);
    }
    return project;
  }

  /**
   * Build the full path to a component directory
   */
  private buildComponentPath(project: ProjectInfo, location: WorkspaceLocation): string {
    const base = project.sourceRoot;
    const parts: string[] = [base];

    if (location.featurePath) {
      parts.push(location.featurePath);
    }

    if (location.componentName) {
      parts.push(location.componentName);
    }

    return this.joinWorkspacePath(...parts);
  }

  /**
   * Join path segments using workspace conventions (always forward slashes)
   */
  private joinWorkspacePath(...segments: string[]): string {
    return segments
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/') // normalize multiple slashes
      .replace(/^\//, ''); // remove leading slash for workspace-relative paths
  }
}

/**
 * Represents a QML source bundle (project-local QML files and assets)
 */
export interface QmlBundle {
  /** Entry QML file (workspace-relative or absolute) */
  entryFile: string;
  /** Component dependencies (other QML files) */
  dependencies: string[];
  /** Asset files referenced by the bundle */
  assets: string[];
}

/**
 * QML bundle resolver that understands QML component graphs
 */
export class QmlBundleResolver {
  /**
   * Resolve QML component dependencies relative to an entry file
   */
  resolveDependency(entryFile: string, typeName: string): string | undefined {
    // This is a placeholder for the actual resolution logic
    // The real implementation would search for TypeName.qml or TypeName.ui.qml
    // relative to the entry file's directory
    return undefined;
  }

  /**
   * Collect all dependencies for a QML bundle
   */
  collectBundle(entryFile: string): QmlBundle {
    return {
      entryFile,
      dependencies: [],
      assets: [],
    };
  }
}

/**
 * Factory for creating workspace-aware path resolvers
 */
export class WorkspaceFactory {
  /**
   * Create a simple single-project workspace structure
   */
  static createSimpleWorkspace(sourceRoot: string = 'src/app'): WorkspaceStructure {
    return {
      root: '',
      projects: new Map([
        ['app', {
          type: 'application',
          sourceRoot,
          root: '',
        }],
      ]),
      defaultProject: 'app',
    };
  }

  /**
   * Create a workspace resolver with a simple structure
   */
  static createSimpleResolver(sourceRoot: string = 'src/app'): WorkspacePathResolver {
    return new WorkspacePathResolver(this.createSimpleWorkspace(sourceRoot));
  }
}
