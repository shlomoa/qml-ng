import { Tree } from '@angular-devkit/schematics';
import {
  planComponentOutput,
  resolveWorkspaceDestinationLayout,
  RouteMode,
  updateBarrelFile,
  updateRouteFile,
  WorkspaceAwareGenerationOptions,
  WorkspaceComponentPlan,
  WorkspaceDestinationLayout
} from './workspace-generation';

export interface GeneratedProjectOptions extends WorkspaceAwareGenerationOptions {}

function featureRootPath(layout: WorkspaceDestinationLayout): string {
  return `/${layout.featureRoot.join('/')}`;
}

function relativeFileSegments(rootPath: string, filePath: string): string[] {
  return filePath
    .slice(rootPath.length)
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean);
}

function collectTreeFiles(tree: Tree): string[] {
  const files: string[] = [];
  tree.getDir('/').visit(filePath => {
    files.push(filePath);
  });
  return files;
}

export function discoverGeneratedComponentPlans(
  tree: Tree,
  options: GeneratedProjectOptions
): WorkspaceComponentPlan[] {
  const layout = resolveWorkspaceDestinationLayout(tree, options);
  const rootPath = featureRootPath(layout);

  return collectTreeFiles(tree)
    .filter((filePath: string) => filePath.startsWith(`${rootPath}/`) && filePath.endsWith('.component.ts'))
    .map((filePath: string) => {
      const segments = relativeFileSegments(rootPath, filePath);

      if (segments.length < 2) {
        return undefined;
      }

      const componentName = segments[segments.length - 2];
      const expectedFileName = `${componentName}.component.ts`;

      if (segments[segments.length - 1] !== expectedFileName) {
        return undefined;
      }

      return planComponentOutput(layout, componentName, segments.slice(0, -2));
    })
    .filter((plan: WorkspaceComponentPlan | undefined): plan is WorkspaceComponentPlan => Boolean(plan))
    .sort((left: WorkspaceComponentPlan, right: WorkspaceComponentPlan) =>
      left.componentDirectory.localeCompare(right.componentDirectory)
    );
}

export function requireActiveRouteMode(routeMode: RouteMode): RouteMode {
  if (routeMode === 'none') {
    throw new Error('routeMode "none" does not update any route configuration');
  }

  return routeMode;
}

function uniquePlans(plans: WorkspaceComponentPlan[]): WorkspaceComponentPlan[] {
  const byDirectory = new Map(plans.map(plan => [plan.componentDirectory, plan]));
  return [...byDirectory.values()].sort((left, right) => left.componentDirectory.localeCompare(right.componentDirectory));
}

export function updateGeneratedProjectArtifacts(
  tree: Tree,
  options: GeneratedProjectOptions & { updateBarrel?: boolean; routeMode?: RouteMode }
): WorkspaceComponentPlan[] {
  const routeMode = options.routeMode ?? 'feature';
  const plans = discoverGeneratedComponentPlans(tree, {
    ...options,
    routeMode
  });

  if (plans.length === 0) {
    throw new Error('No generated component files were found under the target feature root');
  }

  const migratedPlans = uniquePlans(plans);

  if (options.updateBarrel ?? true) {
    updateBarrelFile(tree, migratedPlans);
  }

  if (routeMode !== 'none') {
    updateRouteFile(tree, migratedPlans);
  }

  return migratedPlans;
}

function componentLabel(plan: WorkspaceComponentPlan): string {
  // Error messages use the generated class stem instead of the full Angular class name suffix.
  return plan.className.replace(/Component$/, '');
}

export function validateGeneratedProject(
  tree: Tree,
  options: GeneratedProjectOptions & {
    expectedPlans?: WorkspaceComponentPlan[];
    updateBarrel?: boolean;
    routeMode?: RouteMode;
  }
): string[] {
  const routeMode = options.routeMode ?? 'none';
  const discoveredPlans = discoverGeneratedComponentPlans(tree, {
    ...options,
    routeMode: routeMode === 'none' ? 'feature' : routeMode
  });
  const plans = options.expectedPlans?.length ? uniquePlans(options.expectedPlans) : uniquePlans(discoveredPlans);
  const errors: string[] = [];

  if (plans.length === 0) {
    return ['No generated component files were found under the target feature root'];
  }

  for (const plan of plans) {
    if (!tree.exists(plan.tsPath)) {
      errors.push(`Missing component TypeScript file for ${componentLabel(plan)}: ${plan.tsPath}`);
    }
    if (!tree.exists(plan.htmlPath)) {
      errors.push(`Missing component template for ${componentLabel(plan)}: ${plan.htmlPath}`);
    }
    if (!tree.exists(plan.scssPath)) {
      errors.push(`Missing component stylesheet for ${componentLabel(plan)}: ${plan.scssPath}`);
    }
  }

  if (options.expectedPlans?.length) {
    const discoveredDirectories = new Set(discoveredPlans.map(plan => plan.componentDirectory));

    for (const plan of options.expectedPlans) {
      if (!discoveredDirectories.has(plan.componentDirectory)) {
        errors.push(`Expected generated component is missing: ${plan.componentDirectory}`);
      }
    }
  }

  if (options.updateBarrel) {
    const barrelPath = plans.find(plan => plan.barrelPath)?.barrelPath;
    if (!barrelPath || !tree.exists(barrelPath)) {
      errors.push('Expected barrel file is missing');
    } else {
      const barrelSource = tree.readText(barrelPath);
      for (const plan of plans) {
        if (plan.barrelExportPath && !barrelSource.includes(`export * from '${plan.barrelExportPath}';`)) {
          errors.push(`Barrel file is missing export for ${componentLabel(plan)}: ${plan.barrelExportPath}`);
        }
      }
    }
  }

  if (routeMode !== 'none') {
    const routePath = plans.find(plan => plan.routeFilePath)?.routeFilePath;
    if (!routePath || !tree.exists(routePath)) {
      errors.push('Expected route file is missing');
    } else {
      const routeSource = tree.readText(routePath);
      for (const plan of plans) {
        if (plan.routeDeclaration && !routeSource.includes(plan.routeDeclaration)) {
          errors.push(`Route file is missing declaration for ${componentLabel(plan)}: ${plan.routePath}`);
        }
      }
    }
  }

  return errors;
}
