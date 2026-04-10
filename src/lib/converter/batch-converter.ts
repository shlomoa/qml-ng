/**
 * Batch converter for processing multiple QML files efficiently.
 * Supports performance tracking and memory-bounded processing.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseQml } from '../qml/parser';
import { qmlToUiDocument } from './qml-to-ui';
import { renderAngularMaterial } from '../angular/material-renderer';
import { PerformanceTracker } from '../perf/performance-tracker';
import type { UiDocument } from '../schema/ui-schema';
import type { QmlDocument } from '../qml/ast';

export interface BatchConversionOptions {
  /**
   * Track performance metrics for each stage
   */
  trackPerformance?: boolean;

  /**
   * Maximum number of files to process in parallel
   */
  maxConcurrency?: number;

  /**
   * Whether to continue on errors or stop
   */
  continueOnError?: boolean;

  /**
   * Optional callback for progress updates
   */
  onProgress?: (current: number, total: number, file: string) => void;
}

export interface ConversionResult {
  inputPath: string;
  componentName: string;
  success: boolean;
  error?: string;
  ast?: QmlDocument;
  document?: UiDocument;
  rendered?: {
    ts: string;
    html: string;
    scss: string;
  };
  tracker?: PerformanceTracker;
}

export interface BatchResult {
  results: ConversionResult[];
  totalFiles: number;
  successCount: number;
  errorCount: number;
  aggregateMetrics?: PerformanceTracker;
}

/**
 * Convert a single QML file with performance tracking
 */
export function convertQmlFile(
  inputPath: string,
  componentName: string,
  options: BatchConversionOptions = {}
): ConversionResult {
  const tracker = options.trackPerformance ? new PerformanceTracker() : undefined;
  const result: ConversionResult = {
    inputPath,
    componentName,
    success: false,
    tracker,
  };

  try {
    // Read file
    tracker?.startStage('read');
    const qmlSource = fs.readFileSync(inputPath, 'utf-8');
    tracker?.endStage();

    // Parse QML
    tracker?.startStage('parse');
    const ast = parseQml(qmlSource);
    result.ast = ast;
    tracker?.endStage();

    // Convert to schema
    tracker?.startStage('schema-conversion');
    const document = qmlToUiDocument(componentName, ast);
    result.document = document;
    tracker?.endStage();

    // Render Angular Material
    tracker?.startStage('render');
    const rendered = renderAngularMaterial(document, `${pascalCase(componentName)}Component`);
    result.rendered = rendered;
    tracker?.endStage();

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Convert multiple QML files in batch
 */
export async function convertQmlBatch(
  inputPaths: string[],
  options: BatchConversionOptions = {}
): Promise<BatchResult> {
  const results: ConversionResult[] = [];
  const aggregateTracker = options.trackPerformance ? new PerformanceTracker() : undefined;

  aggregateTracker?.startStage('batch-total');

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i];
    const componentName = path.basename(inputPath, '.qml');

    options.onProgress?.(i + 1, inputPaths.length, inputPath);

    try {
      const result = convertQmlFile(inputPath, componentName, options);
      results.push(result);

      if (!result.success && !options.continueOnError) {
        break;
      }
    } catch (error) {
      results.push({
        inputPath,
        componentName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      if (!options.continueOnError) {
        break;
      }
    }
  }

  aggregateTracker?.endStage();

  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  return {
    results,
    totalFiles: inputPaths.length,
    successCount,
    errorCount,
    aggregateMetrics: aggregateTracker,
  };
}

/**
 * Find all QML files in a directory recursively
 */
export function findQmlFiles(dir: string, options: { maxDepth?: number; exclude?: RegExp[] } = {}): string[] {
  const maxDepth = options.maxDepth ?? Infinity;
  const exclude = options.exclude ?? [/node_modules/, /\.git/, /dist/, /build/];
  const results: string[] = [];

  function walk(currentDir: string, depth: number): void {
    if (depth > maxDepth) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);

      // Check exclusion patterns
      if (exclude.some(pattern => pattern.test(relativePath))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (entry.isFile() && entry.name.endsWith('.qml')) {
        results.push(fullPath);
      }
    }
  }

  walk(dir, 0);
  return results;
}

function pascalCase(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}
