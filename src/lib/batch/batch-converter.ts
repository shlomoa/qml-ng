import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderAngularMaterial, RenderedAngularComponent } from '../angular/material-renderer';
import { qmlToUiDocument } from '../converter/qml-to-ui';
import { formatDiagnosticCounts, countDiagnosticsBySeverity, DiagnosticCounts, hasStrictModeViolations } from '../diagnostics/formatter';
import { componentClassName, dasherize } from '../naming';
import { parseQmlWithDiagnostics } from '../qml/parser';
import { UiDiagnostic, UiDocument } from '../schema/ui-schema';

export type ConversionStatus = 'supported' | 'approximated' | 'unsupported';

export interface GeneratedFile {
  relativePath: string;
  content: string;
}

export interface FileConversionResult {
  sourceFile: string;
  relativeSourcePath: string;
  componentName: string;
  className: string;
  document: UiDocument;
  diagnostics: UiDiagnostic[];
  rendered: RenderedAngularComponent;
  generatedFiles: GeneratedFile[];
  status: ConversionStatus;
  strictViolation: boolean;
}

export interface BatchSummary {
  totalFiles: number;
  supportedFiles: number;
  approximatedFiles: number;
  unsupportedFiles: number;
  diagnostics: DiagnosticCounts;
  strictViolations: number;
}

export interface ConvertQmlFileOptions {
  componentName?: string;
  rootDir?: string;
}

function compareDiagnostics(left: UiDiagnostic, right: UiDiagnostic): number {
  const leftFile = left.file ?? '';
  const rightFile = right.file ?? '';
  if (leftFile !== rightFile) {
    return leftFile.localeCompare(rightFile);
  }

  // Diagnostics without source positions sort after positioned diagnostics so
  // per-file summaries stay stable and anchored to the most actionable entries.
  const leftPosition = left.location?.start.position ?? Number.POSITIVE_INFINITY;
  const rightPosition = right.location?.start.position ?? Number.POSITIVE_INFINITY;
  if (leftPosition !== rightPosition) {
    return leftPosition - rightPosition;
  }

  if (left.severity !== right.severity) {
    return left.severity.localeCompare(right.severity);
  }

  if (left.category !== right.category) {
    return left.category.localeCompare(right.category);
  }

  return left.message.localeCompare(right.message);
}

function classifyConversion(diagnostics: UiDiagnostic[]): ConversionStatus {
  if (hasStrictModeViolations(diagnostics)) {
    return 'unsupported';
  }

  return diagnostics.length > 0 ? 'approximated' : 'supported';
}

function componentNameFromFile(filePath: string): string {
  return path.basename(filePath).replace(/(\.ui)?\.qml$/, '');
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join(path.posix.sep);
}

function createGeneratedFiles(relativeSourcePath: string, componentName: string, rendered: RenderedAngularComponent): GeneratedFile[] {
  const relativeDir = path.posix.dirname(normalizeRelativePath(relativeSourcePath));
  const baseName = dasherize(componentName);
  const baseDir = relativeDir === '.'
    ? baseName
    : path.posix.join(relativeDir, baseName);

  return [
    {
      relativePath: path.posix.join(baseDir, `${baseName}.component.ts`),
      content: rendered.ts
    },
    {
      relativePath: path.posix.join(baseDir, `${baseName}.component.html`),
      content: rendered.html
    },
    {
      relativePath: path.posix.join(baseDir, `${baseName}.component.scss`),
      content: rendered.scss
    }
  ];
}

export function collectQmlFiles(dir: string, recursive = true): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isFile() && (entry.name.endsWith('.qml') || entry.name.endsWith('.ui.qml'))) {
      files.push(fullPath);
      continue;
    }

    if (entry.isDirectory() && recursive) {
      files.push(...collectQmlFiles(fullPath, recursive));
    }
  }

  return files;
}

export function convertQmlFile(filePath: string, options: ConvertQmlFileOptions = {}): FileConversionResult {
  const source = fs.readFileSync(filePath, 'utf8');
  const rootDir = options.rootDir ?? path.dirname(filePath);
  const componentName = options.componentName ?? componentNameFromFile(filePath);
  const parseResult = parseQmlWithDiagnostics(source, {
    filePath,
    searchRoots: [path.dirname(filePath), rootDir]
  });
  const document = qmlToUiDocument(componentName, parseResult.document, filePath);
  const diagnostics = [...parseResult.diagnostics, ...document.diagnostics].sort(compareDiagnostics);
  const rendered = renderAngularMaterial(
    {
      ...document,
      diagnostics
    },
    componentClassName(componentName)
  );
  const relativeSourcePath = normalizeRelativePath(path.relative(rootDir, filePath));

  return {
    sourceFile: filePath,
    relativeSourcePath,
    componentName,
    className: componentClassName(componentName),
    document: {
      ...document,
      diagnostics
    },
    diagnostics,
    rendered,
    generatedFiles: createGeneratedFiles(relativeSourcePath, componentName, rendered),
    status: classifyConversion(diagnostics),
    strictViolation: hasStrictModeViolations(diagnostics)
  };
}

export function convertDirectory(dir: string, recursive = true): FileConversionResult[] {
  return collectQmlFiles(dir, recursive)
    .map(filePath => convertQmlFile(filePath, { rootDir: dir }));
}

export function summarizeBatch(results: FileConversionResult[]): BatchSummary {
  const diagnostics = results.reduce<DiagnosticCounts>(
    (counts, result) => {
      const fileCounts = countDiagnosticsBySeverity(result.diagnostics);
      counts.error += fileCounts.error;
      counts.warning += fileCounts.warning;
      counts.info += fileCounts.info;
      return counts;
    },
    { error: 0, warning: 0, info: 0 }
  );

  return {
    totalFiles: results.length,
    supportedFiles: results.filter(result => result.status === 'supported').length,
    approximatedFiles: results.filter(result => result.status === 'approximated').length,
    unsupportedFiles: results.filter(result => result.status === 'unsupported').length,
    diagnostics,
    strictViolations: results.filter(result => result.strictViolation).length
  };
}

export function formatBatchSummary(summary: BatchSummary): string {
  return [
    'Summary:',
    `  Files: ${summary.totalFiles} total (${summary.supportedFiles} supported, ${summary.approximatedFiles} approximated, ${summary.unsupportedFiles} unsupported)`,
    `  Diagnostics: ${formatDiagnosticCounts(summary.diagnostics)}`,
    `  Strict-mode failures: ${summary.strictViolations}`
  ].join('\n');
}
