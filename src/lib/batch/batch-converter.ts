import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseQml } from '../qml/parser';
import { qmlToUiDocument } from '../converter/qml-to-ui';
import { renderAngularMaterial } from '../angular/material-renderer';
import { UiDiagnostic } from '../schema/ui-schema';

export interface ConversionResult {
  inputFile: string;
  componentName: string;
  success: boolean;
  diagnostics: UiDiagnostic[];
  output?: {
    ts: string;
    html: string;
    scss: string;
  };
  error?: string;
}

export interface BatchConversionSummary {
  totalFiles: number;
  successfulConversions: number;
  failedConversions: number;
  totalDiagnostics: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  results: ConversionResult[];
}

function pascalCase(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function findQmlFiles(directory: string, recursive: boolean = true): string[] {
  const qmlFiles: string[] = [];

  function scan(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && recursive) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.qml')) {
        qmlFiles.push(fullPath);
      }
    }
  }

  scan(directory);
  return qmlFiles;
}

/**
 * Convert a single QML file
 */
export function convertSingleFile(
  inputFile: string,
  componentName?: string
): ConversionResult {
  try {
    const name = componentName || path.basename(inputFile, '.qml');
    const qml = fs.readFileSync(inputFile, 'utf-8');
    const document = qmlToUiDocument(name, parseQml(qml), inputFile);
    const className = `${pascalCase(name)}Component`;
    const rendered = renderAngularMaterial(document, className);

    return {
      inputFile,
      componentName: name,
      success: true,
      diagnostics: document.diagnostics,
      output: rendered
    };
  } catch (error) {
    return {
      inputFile,
      componentName: componentName || path.basename(inputFile, '.qml'),
      success: false,
      diagnostics: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Convert multiple QML files in batch
 */
export function convertBatch(
  inputFiles: string[],
  options: {
    componentNameResolver?: (filePath: string) => string;
  } = {}
): BatchConversionSummary {
  const results: ConversionResult[] = [];

  for (const inputFile of inputFiles) {
    const componentName = options.componentNameResolver
      ? options.componentNameResolver(inputFile)
      : undefined;

    const result = convertSingleFile(inputFile, componentName);
    results.push(result);
  }

  // Aggregate statistics
  const successfulConversions = results.filter(r => r.success).length;
  const failedConversions = results.filter(r => !r.success).length;

  const allDiagnostics = results.flatMap(r => r.diagnostics);
  const errorCount = allDiagnostics.filter(d => d.severity === 'error').length;
  const warningCount = allDiagnostics.filter(d => d.severity === 'warning').length;
  const infoCount = allDiagnostics.filter(d => d.severity === 'info').length;

  return {
    totalFiles: inputFiles.length,
    successfulConversions,
    failedConversions,
    totalDiagnostics: allDiagnostics.length,
    errorCount,
    warningCount,
    infoCount,
    results
  };
}

/**
 * Convert all QML files in a directory
 */
export function convertDirectory(
  directory: string,
  options: {
    recursive?: boolean;
    componentNameResolver?: (filePath: string) => string;
  } = {}
): BatchConversionSummary {
  const recursive = options.recursive ?? true;
  const qmlFiles = findQmlFiles(directory, recursive);

  return convertBatch(qmlFiles, {
    componentNameResolver: options.componentNameResolver
  });
}

/**
 * Format batch conversion summary for display
 */
export function formatBatchSummary(summary: BatchConversionSummary): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('BATCH CONVERSION SUMMARY');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Total files processed: ${summary.totalFiles}`);
  lines.push(`Successful conversions: ${summary.successfulConversions}`);
  lines.push(`Failed conversions: ${summary.failedConversions}`);
  lines.push('');
  lines.push('Diagnostics:');
  lines.push(`  Errors: ${summary.errorCount}`);
  lines.push(`  Warnings: ${summary.warningCount}`);
  lines.push(`  Info: ${summary.infoCount}`);
  lines.push(`  Total: ${summary.totalDiagnostics}`);
  lines.push('');

  // Group results by status
  const failed = summary.results.filter(r => !r.success);
  const withErrors = summary.results.filter(
    r => r.success && r.diagnostics.some(d => d.severity === 'error')
  );
  const withWarnings = summary.results.filter(
    r => r.success && r.diagnostics.some(d => d.severity === 'warning') &&
      !r.diagnostics.some(d => d.severity === 'error')
  );
  const clean = summary.results.filter(
    r => r.success && r.diagnostics.length === 0
  );

  if (failed.length > 0) {
    lines.push('Failed conversions:');
    failed.forEach(r => {
      lines.push(`  ❌ ${r.inputFile}: ${r.error}`);
    });
    lines.push('');
  }

  if (withErrors.length > 0) {
    lines.push('Conversions with errors:');
    withErrors.forEach(r => {
      const errCount = r.diagnostics.filter(d => d.severity === 'error').length;
      lines.push(`  ⚠️  ${r.inputFile} (${errCount} error(s))`);
    });
    lines.push('');
  }

  if (withWarnings.length > 0) {
    lines.push('Conversions with warnings:');
    withWarnings.forEach(r => {
      const warnCount = r.diagnostics.filter(d => d.severity === 'warning').length;
      lines.push(`  ⚡ ${r.inputFile} (${warnCount} warning(s))`);
    });
    lines.push('');
  }

  if (clean.length > 0) {
    lines.push(`Clean conversions: ${clean.length}`);
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}
