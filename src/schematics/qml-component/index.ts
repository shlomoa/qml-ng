import * as fs from 'node:fs';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { formatDiagnostics } from '../../lib/diagnostics/formatter';
import { parseQmlWithDiagnostics } from '../../lib/qml/parser';
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
    const parseResult = parseQmlWithDiagnostics(qmlSource, {
      filePath: options.qmlFile,
      searchRoots: [qmlSourceDirectory(options.qmlFile)]
    });
    const converted = qmlToUiDocument(options.name, parseResult.document, options.qmlFile);
    const document = {
      ...converted,
      diagnostics: [...parseResult.diagnostics, ...converted.diagnostics]
    };
    const rendered = renderAngularMaterial(document, componentPlan.className);

    tree.create(componentPlan.tsPath, rendered.ts);
    tree.create(componentPlan.htmlPath, rendered.html);
    tree.create(componentPlan.scssPath, rendered.scss);

    updateBarrelFile(tree, [componentPlan]);
    updateRouteFile(tree, [componentPlan]);

    if (document.diagnostics.length) {
      context.logger.warn(formatDiagnostics(document.diagnostics).join('\n'));
    }

    context.logger.info(`Generated: ${componentPlan.componentDirectory}`);

    return tree;
  };
}
