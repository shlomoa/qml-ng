import { basename, dirname, normalize, strings } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';

export type RouteMode = 'none' | 'project' | 'feature';

interface WorkspaceProjectRecord {
  root?: string;
  sourceRoot?: string;
}

interface WorkspaceRecord {
  defaultProject?: string;
  projects?: Record<string, WorkspaceProjectRecord | undefined>;
}

export interface WorkspaceAwareGenerationOptions {
  path?: string;
  project?: string;
  feature?: string;
  updateBarrel?: boolean;
  routeMode?: RouteMode;
}

export interface WorkspaceDestinationLayout {
  projectName?: string;
  sourceRoot: string[];
  appRoot: string[];
  featureRoot: string[];
  shellRoot: string[];
  assetRoot: string[];
  updateBarrel: boolean;
  routeMode: RouteMode;
}

export interface WorkspaceComponentPlan {
  projectName?: string;
  componentName: string;
  className: string;
  routePath: string;
  featureRoot: string;
  shellRoot: string;
  assetRoot: string;
  componentDirectory: string;
  tsPath: string;
  htmlPath: string;
  scssPath: string;
  barrelPath?: string;
  barrelExportPath?: string;
  routeFilePath?: string;
  routeImportPath?: string;
  routeDeclaration?: string;
}

const WORKSPACE_FILES = ['/angular.json', '/workspace.json'] as const;

function splitSegments(value?: string): string[] {
  return (value ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0 && segment !== '.');
}

function assertSafeSegments(segments: string[], label: string): void {
  if (segments.some(segment => segment === '..')) {
    throw new Error(`${label} cannot contain '..' segments`);
  }
}

function toTreePath(segments: string[]): string {
  return `/${segments.join('/')}`;
}

function toWorkspacePath(value: string): string[] {
  const segments = splitSegments(value);
  assertSafeSegments(segments, 'Workspace path');
  return segments;
}

function readWorkspaceRecord(tree: Tree): WorkspaceRecord | undefined {
  const workspacePath = WORKSPACE_FILES.find(candidate => tree.exists(candidate));

  if (!workspacePath) {
    return undefined;
  }

  return JSON.parse(tree.readText(workspacePath)) as WorkspaceRecord;
}

function resolveProjectName(workspace: WorkspaceRecord | undefined, requestedProject?: string): string | undefined {
  if (requestedProject) {
    return requestedProject;
  }

  if (!workspace?.projects) {
    return undefined;
  }

  if (typeof workspace.defaultProject === 'string' && workspace.projects[workspace.defaultProject]) {
    return workspace.defaultProject;
  }

  const projectNames = Object.keys(workspace.projects);
  return projectNames.length === 1 ? projectNames[0] : undefined;
}

function resolveProjectRecord(
  workspace: WorkspaceRecord | undefined,
  projectName: string | undefined
): WorkspaceProjectRecord | undefined {
  if (!projectName) {
    return undefined;
  }

  const project = workspace?.projects?.[projectName];

  if (!project) {
    throw new Error(`Project '${projectName}' was not found in the Angular workspace`);
  }

  return project;
}

function joinSegments(...segments: Array<string[] | undefined>): string[] {
  return segments.flatMap(part => part ?? []);
}

function modulePath(fromDirectory: string[], toFileWithoutExtension: string[]): string {
  let commonLength = 0;

  while (
    commonLength < fromDirectory.length &&
    commonLength < toFileWithoutExtension.length &&
    fromDirectory[commonLength] === toFileWithoutExtension[commonLength]
  ) {
    commonLength++;
  }

  const upward = Array.from({ length: fromDirectory.length - commonLength }, () => '..');
  const downward = toFileWithoutExtension.slice(commonLength);
  const relative = [...upward, ...downward];

  if (relative.length === 0) {
    return './';
  }

  const joined = relative.join('/');
  return relative[0].startsWith('.') ? joined : `./${joined}`;
}

function escapeSingleQuotedString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function buildRouteDeclaration(routePath: string, importPath: string, className: string): string {
  return `{ path: '${escapeSingleQuotedString(routePath)}', loadComponent: () => import('${escapeSingleQuotedString(importPath)}').then(m => m.${className}) }`;
}

export function defaultComponentName(name: string): string {
  return strings.dasherize(name);
}

export function componentClassName(name: string): string {
  return `${strings.classify(name)}Component`;
}

export function resolveWorkspaceDestinationLayout(
  tree: Tree,
  options: WorkspaceAwareGenerationOptions
): WorkspaceDestinationLayout {
  const workspace = readWorkspaceRecord(tree);
  const projectName = resolveProjectName(workspace, options.project);
  const project = resolveProjectRecord(workspace, projectName);
  const featureSegments = toWorkspacePath(options.feature ?? '');
  const routeMode = options.routeMode ?? 'none';

  if (options.path) {
    const destinationRoot = toWorkspacePath(options.path);

    return {
      projectName,
      sourceRoot: destinationRoot,
      appRoot: destinationRoot,
      featureRoot: destinationRoot,
      shellRoot: destinationRoot,
      assetRoot: destinationRoot,
      updateBarrel: options.updateBarrel ?? false,
      routeMode
    };
  }

  const projectRoot = toWorkspacePath(project?.root ?? '');
  const sourceRoot = project?.sourceRoot
    ? toWorkspacePath(project.sourceRoot)
    : joinSegments(projectRoot, ['src']);
  const appRoot = sourceRoot[sourceRoot.length - 1] === 'app'
    ? sourceRoot
    : joinSegments(sourceRoot, ['app']);
  const featureRoot = joinSegments(appRoot, featureSegments);
  const assetRoot = joinSegments(sourceRoot, ['assets'], featureSegments);

  return {
    projectName,
    sourceRoot,
    appRoot,
    featureRoot,
    shellRoot: featureRoot,
    assetRoot,
    updateBarrel: options.updateBarrel ?? false,
    routeMode
  };
}

export function planComponentOutput(
  layout: WorkspaceDestinationLayout,
  componentName: string,
  relativeSourceDirectory: string[] = []
): WorkspaceComponentPlan {
  const normalizedComponentName = defaultComponentName(componentName);
  const relativeSegments = relativeSourceDirectory.map(segment => defaultComponentName(segment));
  const componentDirectorySegments = joinSegments(layout.featureRoot, relativeSegments, [normalizedComponentName]);
  const fileBaseName = normalizedComponentName;
  const tsFileSegments = [...componentDirectorySegments, `${fileBaseName}.component`];
  let routeFileSegments: string[] | undefined;

  if (layout.routeMode === 'project') {
    routeFileSegments = [...layout.appRoot, 'app.routes.ts'];
  } else if (layout.routeMode === 'feature') {
    routeFileSegments = [...layout.featureRoot, 'feature.routes.ts'];
  }

  const routeDirectory = routeFileSegments ? splitSegments(dirname(normalize(toTreePath(routeFileSegments)))) : undefined;
  const routePath = [...relativeSegments, normalizedComponentName].join('/');
  const routeImportPath = routeDirectory ? modulePath(routeDirectory, tsFileSegments) : undefined;

  return {
    projectName: layout.projectName,
    componentName: normalizedComponentName,
    className: componentClassName(normalizedComponentName),
    routePath,
    featureRoot: toTreePath(layout.featureRoot),
    shellRoot: toTreePath(layout.shellRoot),
    assetRoot: toTreePath(layout.assetRoot),
    componentDirectory: toTreePath(componentDirectorySegments),
    tsPath: `${toTreePath(componentDirectorySegments)}/${fileBaseName}.component.ts`,
    htmlPath: `${toTreePath(componentDirectorySegments)}/${fileBaseName}.component.html`,
    scssPath: `${toTreePath(componentDirectorySegments)}/${fileBaseName}.component.scss`,
    barrelPath: layout.updateBarrel ? `${toTreePath(layout.featureRoot)}/index.ts` : undefined,
    barrelExportPath: layout.updateBarrel ? modulePath(layout.featureRoot, tsFileSegments) : undefined,
    routeFilePath: routeFileSegments ? toTreePath(routeFileSegments) : undefined,
    routeImportPath,
    routeDeclaration: routeDirectory && routeImportPath
      ? buildRouteDeclaration(routePath, routeImportPath, componentClassName(normalizedComponentName))
      : undefined
  };
}

function sortUniqueLines(lines: Iterable<string>): string[] {
  return [...new Set([...lines].map(line => line.trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

export function updateBarrelFile(tree: Tree, plans: WorkspaceComponentPlan[]): void {
  const firstPlan = plans.find(plan => plan.barrelPath && plan.barrelExportPath);

  if (!firstPlan?.barrelPath) {
    return;
  }

  const exportLines = sortUniqueLines([
    ...(tree.exists(firstPlan.barrelPath) ? tree.readText(firstPlan.barrelPath).split(/\r?\n/) : []),
    ...plans
      .filter(plan => plan.barrelExportPath)
      .map(plan => `export * from '${plan.barrelExportPath}';`)
  ]);

  const nextSource = `${exportLines.join('\n')}\n`;

  if (tree.exists(firstPlan.barrelPath)) {
    tree.overwrite(firstPlan.barrelPath, nextSource);
    return;
  }

  tree.create(firstPlan.barrelPath, nextSource);
}

function routeFileTemplate(entries: string[]): string {
  return [
    `import { Routes } from '@angular/router';`,
    '',
    'export const routes: Routes = [',
    ...entries.map(entry => `  ${entry}`),
    '];',
    ''
  ].join('\n');
}

export function updateRouteFile(tree: Tree, plans: WorkspaceComponentPlan[]): void {
  const firstPlan = plans.find(plan => plan.routeFilePath && plan.routeDeclaration);

  if (!firstPlan?.routeFilePath) {
    return;
  }

  const entries = sortUniqueLines(plans
    .filter(plan => plan.routeDeclaration)
    .map(plan => `${plan.routeDeclaration},`));

  if (!tree.exists(firstPlan.routeFilePath)) {
    tree.create(firstPlan.routeFilePath, routeFileTemplate(entries));
    return;
  }

  const source = tree.readText(firstPlan.routeFilePath);

  if (!source.includes('export const routes: Routes = [')) {
    throw new Error(
      `Unsupported route file format: ${firstPlan.routeFilePath}. Expected file to contain an "export const routes: Routes = [...]" declaration.`
    );
  }

  const merged = entries.filter(entry => !source.includes(entry));

  if (merged.length === 0) {
    return;
  }

  const updated = source.replace(
    /export const routes: Routes = \[([\s\S]*?)\];/,
    (_match, body: string) => {
      const trimmedBody = body.trim();
      const separator = trimmedBody.length > 0 && !trimmedBody.endsWith(',') ? ',' : '';
      const prefix = trimmedBody.length > 0 ? `${trimmedBody}${separator}\n` : '';
      return `export const routes: Routes = [\n${prefix}${merged.map(entry => `  ${entry}`).join('\n')}\n];`;
    }
  );

  tree.overwrite(firstPlan.routeFilePath, updated.endsWith('\n') ? updated : `${updated}\n`);
}

export function qmlSourceDirectory(filePath: string): string {
  const normalizedPath = normalize(filePath);
  return dirname(normalizedPath).toString();
}

export function qmlRelativeDirectory(rootPath: string, filePath: string): string[] {
  const rootSegments = splitSegments(normalize(rootPath));
  const fileDirectory = splitSegments(dirname(normalize(filePath)));

  if (rootSegments.length === 0) {
    return fileDirectory;
  }

  let commonLength = 0;

  while (
    commonLength < rootSegments.length &&
    commonLength < fileDirectory.length &&
    rootSegments[commonLength] === fileDirectory[commonLength]
  ) {
    commonLength++;
  }

  return fileDirectory.slice(commonLength);
}

export function qmlComponentName(filePath: string): string {
  return basename(normalize(filePath)).replace(/\.ui\.qml$/, '').replace(/\.qml$/, '');
}
