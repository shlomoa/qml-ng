import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { BundleGenerationOptions, generateQmlBundle } from '../bundle-generation';

interface Options extends BundleGenerationOptions {
  qmlDir: string;
}

export function qmlBatchSchematic(options: Options): Rule {
  return (tree: Tree, context: SchematicContext) => {
    generateQmlBundle(tree, context, options);
    return tree;
  };
}
