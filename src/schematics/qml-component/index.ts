import * as fs from 'node:fs';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { parseQml } from '../../lib/qml/parser';
import { qmlToUiDocument } from '../../lib/converter/qml-to-ui';
import { renderAngularMaterial } from '../../lib/angular/material-renderer';
import {
  planComponentOutput,
  qmlSourceDirectory,
  resolveWorkspaceDestinationLayout,
  updateBarrelFile,
  updateRouteFile
} from '../workspace-generation';

interface Options {
  name: string;
  qmlFile: string;
  path?: string;
  project?: string;
  feature?: string;
  updateBarrel?: boolean;
  routeMode?: 'none' | 'project' | 'feature';
}

export function qmlComponentSchematic(options: Options): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const qmlSource = fs.readFileSync(options.qmlFile, 'utf-8');
    const layout = resolveWorkspaceDestinationLayout(tree, options);
    const componentPlan = planComponentOutput(layout, options.name);
    const document = qmlToUiDocument(options.name, parseQml(qmlSource, {
      filePath: options.qmlFile,
      searchRoots: [qmlSourceDirectory(options.qmlFile)]
    }));
    const rendered = renderAngularMaterial(document, componentPlan.className);

    tree.create(componentPlan.tsPath, rendered.ts);
    tree.create(componentPlan.htmlPath, rendered.html);
    tree.create(componentPlan.scssPath, rendered.scss);

    updateBarrelFile(tree, [componentPlan]);
    updateRouteFile(tree, [componentPlan]);

    if (document.diagnostics.length) {
      context.logger.warn(document.diagnostics.join('\n'));
    }

    context.logger.info(`Generated: ${componentPlan.componentDirectory}`);

    return tree;
  };
}
