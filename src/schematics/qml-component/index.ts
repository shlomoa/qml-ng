import { normalize, strings } from '@angular-devkit/core';
import {
  Rule,
  SchematicContext,
  Tree,
  apply,
  mergeWith,
  move,
  template,
  url
} from '@angular-devkit/schematics';
import { convertQmlToAngularComponent } from '../../lib/converter/converter';
import type { QmlComponentSchema } from './schema';

export function qmlComponentSchematic(options: QmlComponentSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const qmlPath = normalize(options.qml);
    if (!tree.exists(qmlPath)) {
      throw new Error(`QML file not found in workspace: ${options.qml}`);
    }

    const qmlBuffer = tree.read(qmlPath);
    if (!qmlBuffer) {
      throw new Error(`Failed to read QML file: ${options.qml}`);
    }

    const result = convertQmlToAngularComponent({
      name: options.name,
      selectorPrefix: options.selectorPrefix,
      qmlContent: qmlBuffer.toString('utf-8')
    });

    for (const diagnostic of result.diagnostics) {
      context.logger.warn(diagnostic);
    }

    const targetDir = normalize(`${options.path ?? 'src/app'}/${strings.dasherize(options.name)}`);
    const sourceTemplates = apply(url('./files'), [
      template({
        ...strings,
        ...options,
        className: result.component.className,
        selector: result.component.selector,
        html: result.component.html,
        scss: result.component.scss,
        materialImports: result.component.angularImports.join(', ')
      }),
      move(targetDir)
    ]);

    return mergeWith(sourceTemplates)(tree, context);
  };
}
