import * as fs from 'node:fs';
import * as path from 'node:path';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { formatDiagnostics } from '../../lib/diagnostics/formatter';
import { parseQmlWithDiagnostics } from '../../lib/qml/parser';
import { qmlToUiDocument } from '../../lib/converter/qml-to-ui';
import { renderAngularMaterial } from '../../lib/angular/material-renderer';
import {
  planComponentOutput,
  qmlComponentName,
  qmlRelativeDirectory,
  qmlSourceDirectory,
  resolveWorkspaceDestinationLayout,
  WorkspaceComponentPlan,
  updateBarrelFile,
  updateRouteFile
} from '../workspace-generation';

interface Options {
  qmlDir: string;
  path?: string;
  recursive?: boolean;
  project?: string;
  feature?: string;
  updateBarrel?: boolean;
  routeMode?: 'none' | 'project' | 'feature';
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
    const layout = resolveWorkspaceDestinationLayout(tree, options);

    if (!fs.existsSync(qmlDir) || !fs.statSync(qmlDir).isDirectory()) {
      throw new Error(`Directory not found: ${qmlDir}`);
    }

    const recursive = options.recursive ?? true;
    const qmlFiles = collectQmlFiles(qmlDir, recursive);

    context.logger.info(`Found ${qmlFiles.length} QML file(s) in ${qmlDir}`);

    let successCount = 0;
    let errorCount = 0;
    const generatedPlans: WorkspaceComponentPlan[] = [];

    for (const qmlFile of qmlFiles) {
      try {
        const qmlSource = fs.readFileSync(qmlFile, 'utf-8');
        const componentName = qmlComponentName(qmlFile);
        const componentPlan = planComponentOutput(
          layout,
          componentName,
          qmlRelativeDirectory(qmlDir, qmlFile)
        );

        const parseResult = parseQmlWithDiagnostics(qmlSource, {
          filePath: qmlFile,
          searchRoots: [qmlSourceDirectory(qmlFile), qmlDir]
        });
        const converted = qmlToUiDocument(componentName, parseResult.document, qmlFile);
        const document = {
          ...converted,
          diagnostics: [...parseResult.diagnostics, ...converted.diagnostics]
        };
        const rendered = renderAngularMaterial(document, componentPlan.className);

        tree.create(componentPlan.tsPath, rendered.ts);
        tree.create(componentPlan.htmlPath, rendered.html);
        tree.create(componentPlan.scssPath, rendered.scss);

        if (document.diagnostics.length) {
          context.logger.warn(`${qmlFile}:\n${formatDiagnostics(document.diagnostics).join('\n')}`);
        }

        generatedPlans.push(componentPlan);
        successCount++;
        context.logger.info(`Generated: ${componentPlan.componentDirectory}`);
      } catch (error) {
        errorCount++;
        context.logger.error(`Failed to process ${qmlFile}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    updateBarrelFile(tree, generatedPlans);
    updateRouteFile(tree, generatedPlans);

    context.logger.info(`Completed: ${successCount} succeeded, ${errorCount} failed`);
    return tree;
  };
}
