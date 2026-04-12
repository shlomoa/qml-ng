import * as fs from 'node:fs';
import * as path from 'node:path';
import { SchematicContext, Tree } from '@angular-devkit/schematics';
import { renderAngularMaterial } from '../lib/angular/material-renderer';
import { qmlToUiDocument } from '../lib/converter/qml-to-ui';
import { parseQml } from '../lib/qml/parser';
import { collectResolvedQmlDependencies } from '../lib/qml/qml-resolution';
import { createDiagnostic, UiDiagnostic, UiDocument, UiNode } from '../lib/schema/ui-schema';
import {
  planComponentOutput,
  qmlComponentName,
  qmlRelativeDirectory,
  qmlSourceDirectory,
  resolveWorkspaceDestinationLayout,
  updateBarrelFile,
  updateRouteFile,
  WorkspaceAwareGenerationOptions,
  WorkspaceComponentPlan
} from './workspace-generation';

export interface BundleGenerationOptions extends WorkspaceAwareGenerationOptions {
  qmlDir?: string;
  qmlProject?: string;
  recursive?: boolean;
}

interface BundleSource {
  bundleRoot: string;
  qmlFiles: string[];
  label: string;
}

function collectQmlFiles(dir: string, recursive: boolean): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && (entry.name.endsWith('.qml') || entry.name.endsWith('.ui.qml'))) {
      files.push(fullPath);
    } else if (entry.isDirectory() && recursive) {
      files.push(...collectQmlFiles(fullPath, recursive));
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function readQmlProjectEntries(projectFile: string): { mainFile: string; mainUiFile: string } {
  const source = fs.readFileSync(projectFile, 'utf8');
  const mainFile = source.match(/^\s*mainFile:\s*"([^"]+)"/m)?.[1];
  const mainUiFile = source.match(/^\s*mainUiFile:\s*"([^"]+)"/m)?.[1];

  if (!mainFile || !mainUiFile) {
    throw new Error(`Could not read mainFile/mainUiFile from ${projectFile}`);
  }

  return { mainFile, mainUiFile };
}

function resolveBundleSource(options: BundleGenerationOptions): BundleSource {
  if (options.qmlProject) {
    const projectFile = path.resolve(options.qmlProject);
    const bundleRoot = path.dirname(projectFile);

    if (!fs.existsSync(projectFile) || !fs.statSync(projectFile).isFile()) {
      throw new Error(`QML project not found: ${projectFile}`);
    }

    const { mainFile, mainUiFile } = readQmlProjectEntries(projectFile);
    const searchRoots = [bundleRoot];
    const qmlFiles = new Set<string>([
      ...collectResolvedQmlDependencies(path.join(bundleRoot, mainFile), { searchRoots }),
      ...collectResolvedQmlDependencies(path.join(bundleRoot, mainUiFile), { searchRoots })
    ]);

    return {
      bundleRoot,
      qmlFiles: [...qmlFiles].sort((left, right) => left.localeCompare(right)),
      label: `Resolved ${qmlFiles.size} reachable QML file(s) from ${projectFile}`
    };
  }

  if (!options.qmlDir) {
    throw new Error('Either qmlDir or qmlProject must be provided');
  }

  const qmlDir = path.resolve(options.qmlDir);

  if (!fs.existsSync(qmlDir) || !fs.statSync(qmlDir).isDirectory()) {
    throw new Error(`Directory not found: ${qmlDir}`);
  }

  const recursive = options.recursive ?? true;
  const qmlFiles = collectQmlFiles(qmlDir, recursive);

  return {
    bundleRoot: qmlDir,
    qmlFiles,
    label: `Found ${qmlFiles.length} QML file(s) in ${qmlDir}`
  };
}

function publicAssetPath(assetRoot: string, relativeAssetPath: string): string | undefined {
  const normalizedRoot = assetRoot.replace(/\\/g, '/');
  const sourceRootMarker = '/src/';
  const markerIndex = normalizedRoot.indexOf(sourceRootMarker);

  if (markerIndex < 0) {
    return undefined;
  }

  const publicRoot = normalizedRoot.slice(markerIndex + sourceRootMarker.length).replace(/^\/+/, '');
  return path.posix.join(publicRoot, ...relativeAssetPath.replace(/\\/g, '/').split('/').filter(Boolean));
}

function normalizeRelativeAssetReference(value: string): string | undefined {
  const normalized = value.trim().replace(/\\/g, '/');

  if (
    normalized.length === 0 ||
    normalized.startsWith('/') ||
    normalized.startsWith('qrc:/') ||
    normalized.startsWith('data:') ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

function rewriteBundleAssetBindings(
  node: UiNode,
  document: UiDocument,
  tree: Tree,
  qmlFile: string,
  bundleRoot: string,
  assetRoot: string
): void {
  if (node.kind === 'image') {
    if (node.source?.kind === 'literal' && typeof node.source.value === 'string') {
      const assetReference = normalizeRelativeAssetReference(node.source.value);

      if (assetReference) {
        const assetSourcePath = path.resolve(path.dirname(qmlFile), assetReference);
        const relativeAssetPath = path.relative(bundleRoot, assetSourcePath).replace(/\\/g, '/');

        if (relativeAssetPath.startsWith('..')) {
          document.diagnostics.push(createDiagnostic(
            'warning',
            'unsupported',
            `Bundle asset was not copied because it resolves outside the bundle root: ${node.source.value}`,
            node.location,
            qmlFile,
            'BUNDLE_ASSET_OUTSIDE_ROOT'
          ));
        } else if (!fs.existsSync(assetSourcePath) || !fs.statSync(assetSourcePath).isFile()) {
          document.diagnostics.push(createDiagnostic(
            'warning',
            'unsupported',
            `Bundle asset could not be found and was not copied: ${node.source.value}`,
            node.location,
            qmlFile,
            'BUNDLE_ASSET_MISSING'
          ));
        } else {
          const destinationPath = path.posix.join(assetRoot, ...relativeAssetPath.split('/').filter(Boolean));
          const assetContents = fs.readFileSync(assetSourcePath);

          if (tree.exists(destinationPath)) {
            tree.overwrite(destinationPath, assetContents);
          } else {
            tree.create(destinationPath, assetContents);
          }

          const runtimePath = publicAssetPath(assetRoot, relativeAssetPath);

          if (runtimePath) {
            node.source = {
              ...node.source,
              value: runtimePath
            };
          } else {
            document.diagnostics.push(createDiagnostic(
              'info',
              'unsupported',
              `Bundle asset was copied to ${destinationPath} but requires a manual runtime path update.`,
              node.location,
              qmlFile,
              'BUNDLE_ASSET_RUNTIME_PATH'
            ));
          }
        }
      }
    } else if (node.source?.kind === 'expression') {
      document.diagnostics.push(createDiagnostic(
        'info',
        'unsupported',
        `Dynamic image source requires manual asset mapping: ${node.source.expression}`,
        node.location,
        qmlFile,
        'BUNDLE_ASSET_DYNAMIC_SOURCE'
      ));
    }
  }

  for (const child of node.children) {
    rewriteBundleAssetBindings(child, document, tree, qmlFile, bundleRoot, assetRoot);
  }
}

export function formatDiagnostics(diagnostics: UiDiagnostic[]): string[] {
  return diagnostics.map(diagnostic => {
    const severity = diagnostic.severity.toUpperCase();
    const code = diagnostic.code ? ` ${diagnostic.code}` : '';
    return `${severity}${code}: ${diagnostic.message}`;
  });
}

export interface BundleGenerationResult {
  bundleRoot: string;
  qmlFiles: string[];
  generatedPlans: WorkspaceComponentPlan[];
}

export function generateQmlBundle(
  tree: Tree,
  context: SchematicContext,
  options: BundleGenerationOptions
): BundleGenerationResult {
  const source = resolveBundleSource(options);
  const layout = resolveWorkspaceDestinationLayout(tree, options);
  const generatedPlans: WorkspaceComponentPlan[] = [];

  context.logger.info(source.label);

  let successCount = 0;
  let errorCount = 0;

  for (const qmlFile of source.qmlFiles) {
    try {
      const qmlSource = fs.readFileSync(qmlFile, 'utf-8');
      const componentName = qmlComponentName(qmlFile);
      const componentPlan = planComponentOutput(
        layout,
        componentName,
        qmlRelativeDirectory(source.bundleRoot, qmlFile)
      );

      const document = qmlToUiDocument(componentName, parseQml(qmlSource, {
        filePath: qmlFile,
        searchRoots: [qmlSourceDirectory(qmlFile), source.bundleRoot]
      }));

      rewriteBundleAssetBindings(document.root, document, tree, qmlFile, source.bundleRoot, componentPlan.assetRoot);

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

  return {
    bundleRoot: source.bundleRoot,
    qmlFiles: source.qmlFiles,
    generatedPlans
  };
}
