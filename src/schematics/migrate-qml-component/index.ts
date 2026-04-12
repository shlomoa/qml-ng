import * as fs from 'node:fs';
import * as path from 'node:path';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { parseQml } from '../../lib/qml/parser';
import { qmlToUiDocument } from '../../lib/converter/qml-to-ui';
import { renderAngularMaterial } from '../../lib/angular/material-renderer';
import { SCHEMA_VERSION } from '../../lib/schema/ui-schema';

interface Options {
  componentPath: string;
  qmlFile: string;
  force?: boolean;
}

interface VersionMetadata {
  generatorVersion?: string;
  schemaVersion?: string;
  generatedAt?: string;
}

function pascalCase(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Extract version metadata from a generated TypeScript component file.
 */
function extractVersionFromComponent(content: string): VersionMetadata | null {
  const generatorMatch = content.match(/\* Generator version: ([^\n]+)/);
  const schemaMatch = content.match(/\* Schema version: ([^\n]+)/);
  const dateMatch = content.match(/\* Generated at: ([^\n]+)/);

  if (!generatorMatch && !schemaMatch) {
    return null;
  }

  return {
    generatorVersion: generatorMatch?.[1]?.trim(),
    schemaVersion: schemaMatch?.[1]?.trim(),
    generatedAt: dateMatch?.[1]?.trim()
  };
}

/**
 * Check if migration is needed based on schema version.
 */
function needsMigration(metadata: VersionMetadata | null): boolean {
  if (!metadata || !metadata.schemaVersion) {
    // No version metadata found, assume migration is needed
    return true;
  }

  // Compare schema versions
  const currentMajor = parseInt(SCHEMA_VERSION.split('.')[0], 10);
  const existingMajor = parseInt(metadata.schemaVersion.split('.')[0], 10);

  // Migration needed if major version changed or schema version is different
  return existingMajor < currentMajor || metadata.schemaVersion !== SCHEMA_VERSION;
}

export function migrateQmlComponentSchematic(options: Options): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const componentDir = options.componentPath;
    const componentName = path.basename(componentDir);
    const tsPath = path.posix.join(componentDir, `${componentName}.component.ts`);
    const htmlPath = path.posix.join(componentDir, `${componentName}.component.html`);
    const scssPath = path.posix.join(componentDir, `${componentName}.component.scss`);

    // Check if component exists
    if (!tree.exists(tsPath)) {
      throw new Error(`Component not found at ${tsPath}. Cannot migrate non-existent component.`);
    }

    // Read existing component to check version
    const existingContent = tree.read(tsPath)?.toString('utf-8');
    if (!existingContent) {
      throw new Error(`Could not read component at ${tsPath}`);
    }

    const existingMetadata = extractVersionFromComponent(existingContent);

    if (!options.force && !needsMigration(existingMetadata)) {
      context.logger.info(
        `Component at ${componentDir} is already up-to-date (schema v${existingMetadata?.schemaVersion}). ` +
        `Use --force to regenerate anyway.`
      );
      return tree;
    }

    // Log migration details
    if (existingMetadata) {
      context.logger.info(
        `Migrating component from schema v${existingMetadata.schemaVersion} to v${SCHEMA_VERSION}`
      );
    } else {
      context.logger.info(
        `Migrating component with no version metadata to schema v${SCHEMA_VERSION}`
      );
    }

    // Regenerate from QML source
    if (!fs.existsSync(options.qmlFile)) {
      throw new Error(
        `QML source file not found at ${options.qmlFile}. ` +
        `Cannot regenerate component without source.`
      );
    }

    const qmlSource = fs.readFileSync(options.qmlFile, 'utf-8');
    const document = qmlToUiDocument(componentName, parseQml(qmlSource));
    const className = `${pascalCase(componentName)}Component`;
    const rendered = renderAngularMaterial(document, className);

    // Update files
    tree.overwrite(tsPath, rendered.ts);
    tree.overwrite(htmlPath, rendered.html);
    tree.overwrite(scssPath, rendered.scss);

    if (document.diagnostics.length) {
      context.logger.warn('Diagnostics from regeneration:');
      context.logger.warn(document.diagnostics.join('\n'));
    }

    context.logger.info(`Successfully migrated component at ${componentDir}`);
    return tree;
  };
}
