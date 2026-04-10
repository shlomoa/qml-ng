# Performance and Scale Features

This document describes the performance tracking and batch conversion capabilities of qml-ng.

## Overview

The qml-ng converter includes built-in performance tracking and batch processing capabilities to support production-scale QML-to-Angular conversion workflows.

## Features

### Performance Tracking

The converter tracks timing and memory usage across all pipeline stages:

- **Read**: File I/O time
- **Parse**: QML tokenization and parsing
- **Schema Conversion**: QML AST to intermediate UI schema
- **Render**: Angular Material code generation

#### Single File with Performance Tracking

```bash
node dist/cli.js examples/login.qml --perf
```

This outputs:
- Generated TypeScript, HTML, and SCSS
- Diagnostics
- Performance metrics showing duration and memory delta per stage

#### Performance Metrics Format

```
=== Performance Metrics ===
Files processed: 1
Total duration: 2.58ms
Peak memory: 4.42MB

Stage breakdown:
  read:
    Duration: 0.10ms
    Memory delta: +0.00MB
  parse:
    Duration: 1.12ms
    Memory delta: +0.06MB
  schema-conversion:
    Duration: 0.74ms
    Memory delta: -0.61MB
  render:
    Duration: 0.62ms
    Memory delta: +0.03MB
```

### Batch Conversion

Process multiple QML files in a directory:

```bash
node dist/cli.js --batch examples/FigmaVariants --perf --max-files 10
```

Features:
- Recursive directory scanning for `.qml` files
- Progress reporting during conversion
- Continue-on-error behavior (processes all files even if some fail)
- Aggregate performance metrics across all files
- Error summary

#### Batch Output Example

```
Found 10 QML file(s) in examples/FigmaVariants

Processing 10/10: ItemLayer.qml

=== Batch Conversion Results ===
Total files: 10
Successful: 10
Errors: 0

=== Performance Metrics ===
Files processed: 10
Total duration: 6.87ms
Peak memory: 6.25MB
...
Averages per file:
  Duration: 0.69ms
```

## Benchmarking

A comprehensive benchmark script tests performance on the example corpus:

```bash
npm run benchmark
```

This runs multiple benchmark scenarios:
1. **Small Sample**: Single login.qml file
2. **FigmaVariants Sample**: 10 files from FigmaVariants
3. **WebinarDemo Sample**: 10 files from WebinarDemo
4. **All Basic Examples**: All top-level example files

### Benchmark Output

The benchmark provides:
- Per-scenario timing and memory statistics
- Stage-by-stage breakdown
- Error reporting
- Overall summary across all scenarios

Example benchmark results on typical hardware:
- Average single file processing: ~0.5-1ms
- Average batch throughput: ~1000+ files/second (simple files)
- Memory usage: ~5-7MB peak for typical files

## Performance Characteristics

### Pipeline Stage Distribution

Based on benchmarking typical QML files:

- **Parse**: 40-70% of total time (most expensive stage)
- **Schema Conversion**: 20-30% of total time
- **Render**: 10-20% of total time
- **Read**: <5% of total time

### Memory Behavior

- Memory-bounded processing suitable for large batches
- Typical per-file memory overhead: <1MB
- Peak memory scales sub-linearly with batch size (due to GC)

### Scalability

The converter is designed for production-scale workloads:

- **Single file**: Sub-millisecond for simple forms, <10ms for complex files
- **Batch processing**: Tested with 10-100 file batches
- **Large corpus**: The FigmaVariants and WebinarDemo examples contain 100+ files each

## API Usage

### Programmatic Batch Conversion

```typescript
import { convertQmlBatch, findQmlFiles } from 'qml-ng/lib/converter/batch-converter';

// Find all QML files
const qmlFiles = findQmlFiles('path/to/qml/directory', {
  maxDepth: 5,
  exclude: [/node_modules/, /\.git/]
});

// Convert with performance tracking
const result = await convertQmlBatch(qmlFiles, {
  trackPerformance: true,
  continueOnError: true,
  onProgress: (current, total, file) => {
    console.log(`Processing ${current}/${total}: ${file}`);
  }
});

console.log(`Processed ${result.successCount}/${result.totalFiles} files`);
```

### Performance Tracker API

```typescript
import { PerformanceTracker } from 'qml-ng/lib/perf/performance-tracker';

const tracker = new PerformanceTracker();

tracker.startStage('my-operation');
// ... do work
tracker.endStage();

const metrics = tracker.generateReport(fileCount);
console.log(PerformanceTracker.formatReport(metrics));
```

## Future Improvements

Planned enhancements for production quality:

1. **Caching**: Cache parsed ASTs and intermediate schemas
2. **Incremental Regeneration**: Detect and skip unchanged files
3. **Parallel Processing**: Process multiple files concurrently
4. **Memory Streaming**: Stream large files instead of loading entirely
5. **Hot Paths**: Optimize parsing and schema conversion hot paths

## Related Documentation

- [PLAN.md](./PLAN.md) - Step 14 describes the motivation for performance features
- [SCOPE.md](./SCOPE.md) - Example corpus classification and supported features
- [AGENTS.md](./AGENTS.md) - Architecture and validation approach
