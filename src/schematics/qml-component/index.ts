import * as fs from 'node:fs';
import * as path from 'node:path';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { parseQml } from '../../lib/qml/parser';
import { qmlToUiDocument } from '../../lib/converter/qml-to-ui';
import { renderAngularMaterial } from '../../lib/angular/material-renderer';

interface Options {
  name: string;
  qmlFile: string;
  path?: string;
}

function pascalCase(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

export function qmlComponentSchematic(options: Options): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    const qmlSource = fs.readFileSync(options.qmlFile, 'utf-8');
    const document = qmlToUiDocument(options.name, parseQml(qmlSource));
    const className = `${pascalCase(options.name)}Component`;
    const rendered = renderAngularMaterial(document, className);

    const outputDir = options.path ?? `src/app/${options.name}`;
    const outTree = _tree;

    outTree.create(path.posix.join(outputDir, `${options.name}.component.ts`), rendered.ts);
    outTree.create(path.posix.join(outputDir, `${options.name}.component.html`), rendered.html);
    outTree.create(path.posix.join(outputDir, `${options.name}.component.scss`), rendered.scss);

    if (document.diagnostics.length) {
      context.logger.warn(document.diagnostics.join('\n'));
    }

    return outTree;
  };
}
