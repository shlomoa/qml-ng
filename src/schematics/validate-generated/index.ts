import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import {
  BundleGenerationOptions,
  generateQmlBundle
} from '../bundle-generation';
import { validateGeneratedProject } from '../generated-project';
import { planComponentOutput, qmlComponentName, qmlRelativeDirectory, resolveWorkspaceDestinationLayout } from '../workspace-generation';

interface Options extends BundleGenerationOptions {
  updateBarrel?: boolean;
  routeMode?: 'none' | 'project' | 'feature';
}

export function validateGeneratedSchematic(options: Options): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const layout = resolveWorkspaceDestinationLayout(tree, options);
    const previewTree = tree.branch();
    const generatedPreview = options.qmlDir || options.qmlProject
      ? generateQmlBundle(previewTree, context, options)
      : undefined;
    const expectedPlans = generatedPreview?.qmlFiles.map(qmlFile =>
      planComponentOutput(
        layout,
        qmlComponentName(qmlFile),
        qmlRelativeDirectory(generatedPreview.bundleRoot, qmlFile)
      )
    );
    const errors = validateGeneratedProject(tree, {
      ...options,
      expectedPlans
    });

    if (errors.length) {
      throw new Error(`Generated project validation failed:\n${errors.map(error => `- ${error}`).join('\n')}`);
    }

    const validationScope = expectedPlans?.length ? String(expectedPlans.length) : 'existing';
    context.logger.info(`Validated ${validationScope} generated component(s)`);
    return tree;
  };
}
