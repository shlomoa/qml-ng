import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { updateGeneratedProjectArtifacts } from '../generated-project';

interface Options {
  path?: string;
  project?: string;
  feature?: string;
  updateBarrel?: boolean;
  routeMode?: 'none' | 'project' | 'feature';
}

export function migrateGeneratedSchematic(options: Options): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const plans = updateGeneratedProjectArtifacts(tree, options);
    context.logger.info(`Migrated ${plans.length} generated component(s) to the current workspace conventions`);
    return tree;
  };
}
