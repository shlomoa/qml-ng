#!/usr/bin/env node

/**
 * Benchmark script for testing performance and scale of the QML-to-Angular converter.
 * Measures parse, schema conversion, and render times on example corpus.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertQmlBatch, findQmlFiles } from '../dist/lib/converter/batch-converter.js';
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

    const excludePatterns = (config.exclude || []).map(
      ex => new RegExp(ex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );

    qmlFiles = findQmlFiles(config.dir, {
      maxDepth: config.maxDepth,
      exclude: excludePatterns,
    });

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
  const batchResult = await convertQmlBatch(qmlFiles, {
    trackPerformance: true,
    continueOnError: true,
    onProgress: (current, total, file) => {
      const basename = path.basename(file);
      process.stdout.write(`\rProcessing ${current}/${total}: ${basename.padEnd(40).slice(0, 40)}`);
    },
  });
  const totalTime = performance.now() - startTime;

  console.log('\n');

  // Summary
  console.log('Results:');
  console.log(`  Total files: ${batchResult.totalFiles}`);
  console.log(`  Successful: ${batchResult.successCount}`);
  console.log(`  Errors: ${batchResult.errorCount}`);
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average per file: ${(totalTime / batchResult.totalFiles).toFixed(2)}ms`);

  // Aggregate stage metrics
  const aggregateStages = {};
  if (batchResult.results.length > 0) {

    for (const result of batchResult.results) {
      if (result.tracker) {
        const stages = result.tracker.getStages();
        for (const stage of stages) {
          if (!aggregateStages[stage.name]) {
            aggregateStages[stage.name] = {
              name: stage.name,
              totalDuration: 0,
              count: 0,
              totalMemoryDelta: 0,
              memoryCount: 0,
            };
          }
          aggregateStages[stage.name].totalDuration += stage.duration || 0;
          aggregateStages[stage.name].count += 1;
          if (stage.memoryDelta !== undefined) {
            aggregateStages[stage.name].totalMemoryDelta += stage.memoryDelta;
            aggregateStages[stage.name].memoryCount += 1;
          }
        }
      }
    }

    console.log('\nAverage stage timings:');
    for (const [name, data] of Object.entries(aggregateStages)) {
      const avgDuration = data.totalDuration / data.count;
      const avgMemory = data.memoryCount > 0 ? data.totalMemoryDelta / data.memoryCount : 0;
      console.log(`  ${name}:`);
      console.log(`    Avg duration: ${avgDuration.toFixed(2)}ms`);
      if (data.memoryCount > 0) {
        const sign = avgMemory >= 0 ? '+' : '';
        console.log(`    Avg memory delta: ${sign}${avgMemory.toFixed(2)}MB`);
      }
    }
  }

  // Error summary
  if (batchResult.errorCount > 0) {
    console.log('\nErrors encountered:');
    const errorResults = batchResult.results.filter(r => !r.success);
    for (const result of errorResults.slice(0, 5)) {
      console.log(`  ${path.basename(result.inputPath)}: ${result.error}`);
    }
    if (errorResults.length > 5) {
      console.log(`  ... and ${errorResults.length - 5} more`);
    }
  }

  // Memory summary
  const peakMemories = batchResult.results
    .filter(r => r.tracker)
    .map(r => r.tracker.getPeakMemory())
    .filter(m => m > 0);

  if (peakMemories.length > 0) {
    const avgPeak = peakMemories.reduce((a, b) => a + b, 0) / peakMemories.length;
    const maxPeak = Math.max(...peakMemories);
    console.log('\nMemory usage:');
    console.log(`  Average peak: ${avgPeak.toFixed(2)}MB`);
    console.log(`  Maximum peak: ${maxPeak.toFixed(2)}MB`);
  }

  return {
    config,
    batchResult,
    totalTime,
    aggregateStages,
  };
}

async function main() {
  console.log('QML-to-Angular Converter Performance Benchmark');
  console.log('='.repeat(60));

  const results = [];

  for (const config of BENCHMARK_CONFIGS) {
    const result = await runBenchmark(config);
    if (result) {
      results.push(result);
    }
  }

  // Overall summary
  console.log('\n' + '='.repeat(60));
  console.log('Overall Summary');
  console.log('='.repeat(60));

  let totalProcessed = 0;
  let totalSuccessful = 0;
  let totalErrors = 0;
  let totalTime = 0;

  for (const result of results) {
    totalProcessed += result.batchResult.totalFiles;
    totalSuccessful += result.batchResult.successCount;
    totalErrors += result.batchResult.errorCount;
    totalTime += result.totalTime;
  }

  console.log(`Total files processed: ${totalProcessed}`);
  console.log(`Total successful: ${totalSuccessful}`);
  console.log(`Total errors: ${totalErrors}`);
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
