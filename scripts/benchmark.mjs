#!/usr/bin/env node

/**
 * Benchmark script for testing performance and scale of the QML-to-Angular converter.
 * Measures parse, schema conversion, and render times on example corpus.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectQmlFiles, convertQmlFile, summarizeBatch } from '../dist/lib/batch/batch-converter.js';
import { PerformanceTracker } from '../dist/lib/perf/performance-tracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Configuration for benchmark runs
const BENCHMARK_CONFIGS = [
  {
    name: 'Small Sample (login.qml)',
    paths: [path.join(rootDir, 'examples/login.qml')],
  },
  {
    name: 'FigmaVariants Sample (10 files)',
    dir: path.join(rootDir, 'examples/FigmaVariants'),
    maxFiles: 10,
  },
  {
    name: 'WebinarDemo Sample (10 files)',
    dir: path.join(rootDir, 'examples/WebinarDemo'),
    maxFiles: 10,
  },
  {
    name: 'All Basic Examples',
    dir: path.join(rootDir, 'examples'),
    exclude: ['FigmaVariants', 'WebinarDemo'],
    maxDepth: 1,
  },
];

async function runBenchmark(config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmark: ${config.name}`);
  console.log('='.repeat(60));

  let qmlFiles = [];

  if (config.paths) {
    qmlFiles = config.paths.filter(p => fs.existsSync(p));
  } else if (config.dir) {
    if (!fs.existsSync(config.dir)) {
      console.log(`⚠️  Directory not found: ${config.dir}`);
      return null;
    }

    // Use collectQmlFiles with manual depth filtering
    qmlFiles = collectQmlFiles(config.dir, config.maxDepth !== 1);

    // Filter by exclude patterns
    if (config.exclude && config.exclude.length > 0) {
      const excludePatterns = config.exclude.map(
        ex => new RegExp(ex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      );
      qmlFiles = qmlFiles.filter(filePath => {
        const relativePath = path.relative(config.dir, filePath);
        return !excludePatterns.some(pattern => pattern.test(relativePath));
      });
    }

    if (config.maxFiles && qmlFiles.length > config.maxFiles) {
      qmlFiles = qmlFiles.slice(0, config.maxFiles);
    }
  }

  if (qmlFiles.length === 0) {
    console.log('⚠️  No QML files found');
    return null;
  }

  console.log(`Found ${qmlFiles.length} QML file(s)`);
  console.log('');

  // Run conversion with performance tracking
  const startTime = performance.now();
  const results = [];

  for (let i = 0; i < qmlFiles.length; i++) {
    const filePath = qmlFiles[i];
    const basename = path.basename(filePath);
    process.stdout.write(`\rProcessing ${i + 1}/${qmlFiles.length}: ${basename.padEnd(40).slice(0, 40)}`);

    try {
      const result = convertQmlFile(filePath, {
        rootDir: config.dir ?? path.dirname(filePath),
        trackPerformance: true
      });
      results.push(result);
    } catch (error) {
      // Continue on error
      console.error(`\nError processing ${basename}: ${error.message}`);
    }
  }

  const totalTime = performance.now() - startTime;

  console.log('\n');

  // Summary
  const summary = summarizeBatch(results);
  console.log('Results:');
  console.log(`  Total files: ${summary.totalFiles}`);
  console.log(`  Supported: ${summary.supportedFiles}`);
  console.log(`  Approximated: ${summary.approximatedFiles}`);
  console.log(`  Unsupported: ${summary.unsupportedFiles}`);
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average per file: ${(totalTime / summary.totalFiles).toFixed(2)}ms`);

  // Performance metrics if available
  if (summary.performanceMetrics) {
    console.log('\nPerformance Metrics:');
    console.log(PerformanceTracker.formatReport(summary.performanceMetrics));
  }

  return {
    config,
    results,
    summary,
    totalTime
  };
}

async function main() {
  console.log('QML-to-Angular Converter Performance Benchmark');
  console.log('='.repeat(60));

  const benchmarkResults = [];

  for (const config of BENCHMARK_CONFIGS) {
    const result = await runBenchmark(config);
    if (result) {
      benchmarkResults.push(result);
    }
  }

  // Overall summary
  console.log('\n' + '='.repeat(60));
  console.log('Overall Summary');
  console.log('='.repeat(60));

  let totalProcessed = 0;
  let totalSupported = 0;
  let totalApproximated = 0;
  let totalUnsupported = 0;
  let totalTime = 0;

  for (const result of benchmarkResults) {
    totalProcessed += result.summary.totalFiles;
    totalSupported += result.summary.supportedFiles;
    totalApproximated += result.summary.approximatedFiles;
    totalUnsupported += result.summary.unsupportedFiles;
    totalTime += result.totalTime;
  }

  console.log(`Total files processed: ${totalProcessed}`);
  console.log(`Total supported: ${totalSupported}`);
  console.log(`Total approximated: ${totalApproximated}`);
  console.log(`Total unsupported: ${totalUnsupported}`);
  console.log(`Total time: ${totalTime.toFixed(2)}ms`);
  if (totalProcessed > 0) {
    console.log(`Average per file: ${(totalTime / totalProcessed).toFixed(2)}ms`);
  }

  console.log('\nBenchmark complete!');
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
