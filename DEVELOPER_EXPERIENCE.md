# Developer Experience Features

This document describes the developer experience enhancements added in Step 15 of the roadmap.

## Enhanced Diagnostics

### Structured Diagnostic Format

Diagnostics now include:
- **Severity levels**: `error`, `warning`, `info`
- **Source positions**: File path, line number, column number (when available)
- **Detailed messages**: Clear descriptions of issues

### Diagnostic Output

```bash
# Example diagnostic output
examples/file.qml:10:5 - WARNING: Unsupported QML type: CustomControl
```

### Summary Reports

All diagnostic commands provide a summary showing:
- Total number of errors
- Total number of warnings
- Total number of info messages

## CLI Modes

### Dry-Run Mode

Preview generated output without writing files:

```bash
qml-ng input.qml --dry-run
```

### Diff Mode

Show what changes would be made (implies dry-run):

```bash
qml-ng input.qml --diff
```

### Strict Mode

Fail conversion if there are any unsupported features:

```bash
qml-ng input.qml --strict

# Exit code 1 if warnings or errors are present
```

### Verbose Mode

Show detailed diagnostics for all processed files:

```bash
qml-ng input.qml --verbose
# or
qml-ng input.qml -v
```

## Batch Conversion

### Directory Processing

Convert all QML files in a directory:

```bash
# Convert all QML files recursively
qml-ng examples/ --batch --output-dir output/

# Non-recursive (only top-level files)
qml-ng examples/ --batch --no-recursive
```

### Batch Summary

Batch conversions provide aggregate statistics:

```
============================================================
BATCH CONVERSION SUMMARY
============================================================

Total files processed: 10
Successful conversions: 8
Failed conversions: 2

Diagnostics:
  Errors: 3
  Warnings: 5
  Info: 2
  Total: 10

Conversions with errors:
  ⚠️  file1.qml (2 error(s))

Conversions with warnings:
  ⚡ file2.qml (3 warning(s))
  ⚡ file3.qml (2 warning(s))

Clean conversions: 6

============================================================
```

### Verbose Batch Mode

See detailed diagnostics for each file:

```bash
qml-ng examples/ --batch --verbose
```

## Generated Code Quality

### Deterministic Output

- **Import ordering**: All imports are sorted alphabetically for consistent output
- **Stable naming**: Component names follow predictable conventions
- **Reproducible generation**: Same input always produces same output

### Approximation Comments

Unsupported features are marked with TODO comments:

```html
<!-- TODO: Unsupported QML type "CustomWidget" - manual implementation required -->
<div class="qml-unsupported">Unsupported node: CustomWidget</div>
```

## Output Control

### Output Directory

Write generated files to a specific directory:

```bash
# Single file
qml-ng input.qml --name MyComponent --output-dir src/app/components

# Batch mode creates subdirectories for each component
qml-ng examples/ --batch --output-dir output/
```

Generated structure for batch mode:
```
output/
  component1/
    component1.component.ts
    component1.component.html
    component1.component.scss
  component2/
    component2.component.ts
    component2.component.html
    component2.component.scss
```

## Usage Examples

### Basic Conversion with Diagnostics

```bash
qml-ng login.qml --name LoginForm
```

### Preview Before Writing

```bash
qml-ng login.qml --diff
```

### Strict Validation

```bash
qml-ng login.qml --strict --verbose
```

### Batch Conversion with Output

```bash
qml-ng examples/ --batch --output-dir generated/ --verbose
```

### Strict Batch Validation

```bash
# Fail if any file has unsupported features
qml-ng examples/ --batch --strict
```

## Exit Codes

The CLI uses standard exit codes:

- **0**: Success, no errors
- **1**: Errors encountered or strict mode failures

## Integration with CI/CD

### Check for Unsupported Features

```bash
# Fail build if unsupported features detected
qml-ng src/qml/ --batch --strict
```

### Generate Reports

```bash
# Create conversion reports
qml-ng src/qml/ --batch --verbose > conversion-report.txt
```

### Preview Changes

```bash
# Review what would be generated
qml-ng input.qml --diff > preview.txt
```

## Programmatic API

The batch converter can also be used programmatically:

```typescript
import { convertDirectory, formatBatchSummary } from 'qml-ng/lib/batch/batch-converter';

const summary = convertDirectory('examples/', {
  recursive: true
});

console.log(formatBatchSummary(summary));

// Access individual results
for (const result of summary.results) {
  if (result.success && result.output) {
    // Use result.output.ts, result.output.html, result.output.scss
  }
}
```

## Diagnostic Formatter API

Format diagnostics programmatically:

```typescript
import { formatDiagnostics } from 'qml-ng/lib/diagnostics/formatter';

const diagnostics = document.diagnostics;
const formatted = formatDiagnostics(diagnostics, { verbose: true });
console.log(formatted);
```
