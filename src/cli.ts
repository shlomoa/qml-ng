import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderAngularMaterial } from './lib/angular/material-renderer';
import { qmlToUiDocument } from './lib/converter/qml-to-ui';
import { parseQml } from './lib/qml/parser';
import { convertQmlBatch, convertQmlFile, findQmlFiles } from './lib/converter/batch-converter';
import { PerformanceTracker } from './lib/perf/performance-tracker';

function pascalCase(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function printUsage(): void {
  console.log('Usage:');
  console.log('  qml-ng <input.qml> [--name <component-name>] [--perf]');
  console.log('  qml-ng --batch <directory> [--perf] [--max-files <n>]');
  console.log('');
  console.log('Options:');
  console.log('  --name <name>      Component name (default: derived from filename)');
  console.log('  --perf             Show performance metrics');
  console.log('  --batch <dir>      Process all QML files in directory');
  console.log('  --max-files <n>    Maximum number of files to process in batch mode');
}

const [, , firstArg, ...rest] = process.argv;

if (!firstArg || firstArg === '--help' || firstArg === '-h') {
  printUsage();
  process.exit(firstArg ? 0 : 1);
}

// Parse command line arguments
const hasPerf = rest.includes('--perf');
const batchMode = firstArg === '--batch';
const nameIndex = rest.indexOf('--name');
const maxFilesIndex = rest.indexOf('--max-files');

if (batchMode) {
  // Batch mode: process multiple files
  const batchDirIndex = rest.indexOf('--batch');
  const batchDir = batchDirIndex >= 0 ? rest[batchDirIndex + 1] : rest[0];

  if (!batchDir) {
    console.error('Error: --batch requires a directory argument');
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(batchDir)) {
    console.error(`Error: Directory not found: ${batchDir}`);
    process.exit(1);
  }

  const maxFiles = maxFilesIndex >= 0 ? parseInt(rest[maxFilesIndex + 1], 10) : undefined;
  let qmlFiles = findQmlFiles(batchDir);

  if (maxFiles && qmlFiles.length > maxFiles) {
    qmlFiles = qmlFiles.slice(0, maxFiles);
  }

  console.log(`Found ${qmlFiles.length} QML file(s) in ${batchDir}`);
  console.log('');

  convertQmlBatch(qmlFiles, {
    trackPerformance: hasPerf,
    continueOnError: true,
    onProgress: (current, total, file) => {
      process.stdout.write(`\rProcessing ${current}/${total}: ${path.basename(file).padEnd(30).slice(0, 30)}`);
    },
  }).then(result => {
    console.log('\n');
    console.log('=== Batch Conversion Results ===');
    console.log(`Total files: ${result.totalFiles}`);
    console.log(`Successful: ${result.successCount}`);
    console.log(`Errors: ${result.errorCount}`);

    if (result.errorCount > 0) {
      console.log('\nErrors:');
      const errors = result.results.filter(r => !r.success);
      for (const err of errors.slice(0, 10)) {
        console.log(`  ${path.basename(err.inputPath)}: ${err.error}`);
      }
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }

    if (hasPerf && result.aggregateMetrics) {
      console.log('\n=== Performance Metrics ===');
      const metrics = result.aggregateMetrics.generateReport(result.totalFiles);
      console.log(PerformanceTracker.formatReport(metrics));
    }
  }).catch(err => {
    console.error('Batch conversion failed:', err);
    process.exit(1);
  });
} else {
  // Single file mode (original behavior)
  const inputFile = firstArg;

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  const rawName = nameIndex >= 0 ? rest[nameIndex + 1] : path.basename(inputFile, '.qml');
  const componentName = rawName || 'qml-component';

  if (hasPerf) {
    // Use batch converter for single file with performance tracking
    const result = convertQmlFile(inputFile, componentName, { trackPerformance: true });

    if (!result.success) {
      console.error(`Error: ${result.error}`);
      process.exit(1);
    }

    console.log('----- TS -----');
    console.log(result.rendered!.ts);
    console.log('----- HTML -----');
    console.log(result.rendered!.html);
    console.log('----- SCSS -----');
    console.log(result.rendered!.scss);
    console.log('----- DIAGNOSTICS -----');
    console.log(result.document!.diagnostics.join('\n') || 'None');

    if (result.tracker) {
      console.log('\n----- PERFORMANCE METRICS -----');
      const metrics = result.tracker.generateReport(1);
      console.log(PerformanceTracker.formatReport(metrics));
    }
  } else {
    // Original fast path without performance tracking
    const qml = fs.readFileSync(inputFile, 'utf-8');
    const document = qmlToUiDocument(componentName, parseQml(qml));
    const rendered = renderAngularMaterial(document, `${pascalCase(componentName)}Component`);

    console.log('----- TS -----');
    console.log(rendered.ts);
    console.log('----- HTML -----');
    console.log(rendered.html);
    console.log('----- SCSS -----');
    console.log(rendered.scss);
    console.log('----- DIAGNOSTICS -----');
    console.log(document.diagnostics.join('\n') || 'None');
  }
}
