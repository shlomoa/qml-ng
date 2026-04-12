import * as fs from 'node:fs';
import * as path from 'node:path';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { formatDiagnostics } from '../../lib/diagnostics/formatter';
import { componentClassName, dasherize } from '../../lib/naming';
import { parseQmlWithDiagnostics } from '../../lib/qml/parser';
import { qmlToUiDocument } from '../../lib/converter/qml-to-ui';
import { renderAngularMaterial } from '../../lib/angular/material-renderer';

interface Options {
  qmlDir: string;
  path?: string;
  recursive?: boolean;
}

function collectQmlFiles(dir: string, recursive: boolean): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && (entry.name.endsWith('.qml') || entry.name.endsWith('.ui.qml'))) {
      files.push(fullPath);
    } else if (entry.isDirectory() && recursive) {
      files.push(...collectQmlFiles(fullPath, recursive));
    }
  }

  return files;
}

export function qmlBatchSchematic(options: Options): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const qmlDir = path.resolve(options.qmlDir);

    if (!fs.existsSync(qmlDir) || !fs.statSync(qmlDir).isDirectory()) {
      throw new Error(`Directory not found: ${qmlDir}`);
    }

    const recursive = options.recursive ?? true;
    const qmlFiles = collectQmlFiles(qmlDir, recursive);

    context.logger.info(`Found ${qmlFiles.length} QML file(s) in ${qmlDir}`);

    let successCount = 0;
    let errorCount = 0;

    for (const qmlFile of qmlFiles) {
      try {
        const qmlSource = fs.readFileSync(qmlFile, 'utf-8');
        const relativePath = path.relative(qmlDir, qmlFile);
        const baseName = path.basename(qmlFile, path.extname(qmlFile));
        const componentName = baseName.replace(/\.ui$/, '');

        const parseResult = parseQmlWithDiagnostics(qmlSource, {
          filePath: qmlFile,
          searchRoots: [path.dirname(qmlFile), qmlDir]
        });
        const converted = qmlToUiDocument(componentName, parseResult.document, qmlFile);
        const document = {
          ...converted,
          diagnostics: [...parseResult.diagnostics, ...converted.diagnostics]
        };

        const className = componentClassName(componentName);
        const rendered = renderAngularMaterial(document, className);

        // Preserve directory structure relative to qmlDir
        const relativeDir = path.dirname(relativePath);
        const outputBase = options.path ?? 'src/app';
        const outputDir = relativeDir
          ? path.posix.join(outputBase, relativeDir, dasherize(componentName))
          : path.posix.join(outputBase, dasherize(componentName));

        tree.create(path.posix.join(outputDir, `${dasherize(componentName)}.component.ts`), rendered.ts);
        tree.create(path.posix.join(outputDir, `${dasherize(componentName)}.component.html`), rendered.html);
        tree.create(path.posix.join(outputDir, `${dasherize(componentName)}.component.scss`), rendered.scss);

        if (document.diagnostics.length) {
          context.logger.warn(`${qmlFile}:\n${formatDiagnostics(document.diagnostics).join('\n')}`);
        }

        successCount++;
        context.logger.info(`Generated: ${outputDir}`);
      } catch (error) {
        errorCount++;
        context.logger.error(`Failed to process ${qmlFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    context.logger.info(`Completed: ${successCount} succeeded, ${errorCount} failed`);
    return tree;
  };
}
