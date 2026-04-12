import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { discoverGeneratedComponentPlans, ensureRouteMode } from '../generated-project';
import { updateRouteFile } from '../workspace-generation';

interface Options {
  path?: string;
  project?: string;
  feature?: string;
  routeMode?: 'project' | 'feature';
}

export function updateRoutesSchematic(options: Options): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const routeMode = ensureRouteMode(options.routeMode ?? 'feature');
    const plans = discoverGeneratedComponentPlans(tree, { ...options, routeMode });

    if (plans.length === 0) {
      throw new Error('No generated component files were found under the target feature root');
    }

    updateRouteFile(tree, plans);
    context.logger.info(`Updated routes for ${plans.length} generated component(s)`);
    return tree;
  };
}
