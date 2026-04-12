import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderAngularMaterial } from '../angular/material-renderer';
import { RenderedAngularComponent } from '../angular/renderer-contract';
import { qmlToUiDocument } from '../converter/qml-to-ui';
import { formatDiagnosticCounts, countDiagnosticsBySeverity, DiagnosticCounts, hasStrictModeViolations } from '../diagnostics/formatter';
import { componentClassName, dasherize } from '../naming';
import { parseQmlWithDiagnostics } from '../qml/parser';
import { UiDiagnostic, UiDocument } from '../schema/ui-schema';
import { PerformanceTracker, ConversionMetrics } from '../perf/performance-tracker';

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
  performanceMetrics?: ConversionMetrics;
}

export interface BatchSummary {
  totalFiles: number;
  supportedFiles: number;
  approximatedFiles: number;
  unsupportedFiles: number;
  diagnostics: DiagnosticCounts;
  strictViolations: number;
  performanceMetrics?: ConversionMetrics;
}

export interface ConvertQmlFileOptions {
  componentName?: string;
  rootDir?: string;
  trackPerformance?: boolean;
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
  const tracker = options.trackPerformance ? new PerformanceTracker() : undefined;

  tracker?.startStage('read');
  const source = fs.readFileSync(filePath, 'utf8');
  tracker?.endStage();

  const rootDir = options.rootDir ?? path.dirname(filePath);
  const componentName = options.componentName ?? componentNameFromFile(filePath);

  tracker?.startStage('parse');
  const parseResult = parseQmlWithDiagnostics(source, {
    filePath,
    searchRoots: [path.dirname(filePath), rootDir]
  });
  tracker?.endStage();

  tracker?.startStage('schema-conversion');
  const document = qmlToUiDocument(componentName, parseResult.document, filePath);
  const diagnostics = [...parseResult.diagnostics, ...document.diagnostics].sort(compareDiagnostics);
  tracker?.endStage();

  tracker?.startStage('render');
  const rendered = renderAngularMaterial(
    {
      ...document,
      diagnostics
    },
    componentClassName(componentName)
  );
  tracker?.endStage();

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
    strictViolation: hasStrictModeViolations(diagnostics),
    performanceMetrics: tracker ? tracker.generateReport(1) : undefined
  };
}

export interface ConvertDirectoryOptions {
  recursive?: boolean;
  trackPerformance?: boolean;
}

export function convertDirectory(dir: string, options: ConvertDirectoryOptions = {}): FileConversionResult[] {
  const recursive = options.recursive ?? true;
  const trackPerformance = options.trackPerformance ?? false;

  return collectQmlFiles(dir, recursive)
    .map(filePath => convertQmlFile(filePath, { rootDir: dir, trackPerformance }));
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

  // Aggregate performance metrics if any results have them
  let performanceMetrics: ConversionMetrics | undefined;
  const resultsWithMetrics = results.filter(r => r.performanceMetrics);

  if (resultsWithMetrics.length > 0) {
    const aggregateTracker = new PerformanceTracker();
    aggregateTracker.startStage('batch-total');

    // Collect all stage metrics across files
    const aggregatedStages = new Map<string, { totalDuration: number; totalMemoryDelta: number; count: number }>();

    for (const result of resultsWithMetrics) {
      if (result.performanceMetrics) {
        for (const stage of result.performanceMetrics.stages) {
          const existing = aggregatedStages.get(stage.name) ?? { totalDuration: 0, totalMemoryDelta: 0, count: 0 };
          existing.totalDuration += stage.duration ?? 0;
          existing.totalMemoryDelta += stage.memoryDelta ?? 0;
          existing.count += 1;
          aggregatedStages.set(stage.name, existing);
        }
      }
    }

    aggregateTracker.endStage();

    // Create synthetic stages with averaged metrics
    const syntheticStages = Array.from(aggregatedStages.entries()).map(([name, data]) => ({
      name,
      startTime: 0,
      endTime: data.totalDuration,
      duration: data.totalDuration,
      memoryBefore: 0,
      memoryAfter: data.totalMemoryDelta,
      memoryDelta: data.totalMemoryDelta
    }));

    const totalDuration = Array.from(aggregatedStages.values()).reduce((sum, stage) => sum + stage.totalDuration, 0);
    const peakMemory = Math.max(...resultsWithMetrics.map(r => r.performanceMetrics?.peakMemory ?? 0));

    performanceMetrics = {
      totalDuration,
      stages: syntheticStages,
      peakMemory,
      fileCount: results.length
    };
  }

  return {
    totalFiles: results.length,
    supportedFiles: results.filter(result => result.status === 'supported').length,
    approximatedFiles: results.filter(result => result.status === 'approximated').length,
    unsupportedFiles: results.filter(result => result.status === 'unsupported').length,
    diagnostics,
    strictViolations: results.filter(result => result.strictViolation).length,
    performanceMetrics
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
