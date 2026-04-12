import * as fs from 'node:fs';
import * as path from 'node:path';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { formatDiagnostics } from '../../lib/diagnostics/formatter';
import { componentClassName } from '../../lib/naming';
import { parseQmlWithDiagnostics } from '../../lib/qml/parser';
import { qmlToUiDocument } from '../../lib/converter/qml-to-ui';
import { renderAngularMaterial } from '../../lib/angular/material-renderer';

interface Options {
  name: string;
  qmlFile: string;
  path?: string;
}

export function qmlComponentSchematic(options: Options): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    const qmlSource = fs.readFileSync(options.qmlFile, 'utf-8');
    const parseResult = parseQmlWithDiagnostics(qmlSource, {
      filePath: options.qmlFile,
      searchRoots: [path.dirname(options.qmlFile)]
    });
    const converted = qmlToUiDocument(options.name, parseResult.document, options.qmlFile);
    const document = {
      ...converted,
      diagnostics: [...parseResult.diagnostics, ...converted.diagnostics]
    };
    const className = componentClassName(options.name);
    const rendered = renderAngularMaterial(document, className);

    const outputDir = options.path ?? `src/app/${options.name}`;
    const outTree = _tree;

    outTree.create(path.posix.join(outputDir, `${options.name}.component.ts`), rendered.ts);
    outTree.create(path.posix.join(outputDir, `${options.name}.component.html`), rendered.html);
    outTree.create(path.posix.join(outputDir, `${options.name}.component.scss`), rendered.scss);

    if (document.diagnostics.length) {
      context.logger.warn(formatDiagnostics(document.diagnostics).join('\n'));
    }

    return outTree;
  };
}
