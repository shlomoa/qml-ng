import * as fs from 'node:fs';
import * as path from 'node:path';
import { collectQmlFiles, convertQmlFile, convertDirectory, FileConversionResult, formatBatchSummary, summarizeBatch } from './lib/batch/batch-converter';
import { countDiagnosticsBySeverity, formatDiagnosticCounts, formatDiagnostics } from './lib/diagnostics/formatter';
import { dasherize } from './lib/naming';

interface CliOptions {
  inputPath: string;
  componentName?: string;
  outputDir?: string;
  dryRun: boolean;
  diff: boolean;
  strict: boolean;
  batch: boolean;
  recursive: boolean;
  verbose: boolean;
}

const MAX_DIFF_MATRIX_CELLS = 250_000;

function printUsage(): void {
  console.error(
    [
      'Usage: qml-ng <input.qml | input-directory> [options]',
      '',
      'Options:',
      '  --name <component-name>  Override the generated component name for single-file input',
      '  --output-dir <dir>       Write generated files to this directory',
      '  --dry-run                Preview generated files without writing them',
      '  --diff                   Show line-by-line diffs against files in --output-dir',
      '  --strict                 Exit with code 1 when unsupported features are detected',
      '  --batch                  Treat the input path as a directory bundle',
      '  --no-recursive           Do not recurse into subdirectories in batch mode',
      '  --verbose                Print per-file diagnostics in batch mode'
    ].join('\n')
  );
}

function parseArgs(argv: string[]): CliOptions | undefined {
  const [inputPath, ...rest] = argv;
  if (!inputPath) {
    return undefined;
  }

  const options: CliOptions = {
    inputPath,
    dryRun: false,
    diff: false,
    strict: false,
    batch: false,
    recursive: true,
    verbose: false
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    switch (arg) {
      case '--name':
        options.componentName = rest[++index];
        break;
      case '--output-dir':
        options.outputDir = rest[++index];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--diff':
        options.diff = true;
        break;
      case '--strict':
        options.strict = true;
        break;
      case '--batch':
        options.batch = true;
        break;
      case '--no-recursive':
        options.recursive = false;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        return undefined;
    }
  }

  return options;
}

function ensureOptionValue(value: string | undefined, flag: string): string {
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function readExistingFile(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

type DiffOperation = { type: 'equal' | 'add' | 'remove'; line: string };

function diffLines(left: string[], right: string[]): DiffOperation[] {
  const matrix = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));

  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      matrix[i][j] = left[i] === right[j]
        ? matrix[i + 1][j + 1] + 1
        : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    }
  }

  const operations: DiffOperation[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] === right[j]) {
      operations.push({ type: 'equal', line: left[i] });
      i += 1;
      j += 1;
      continue;
    }

    if (matrix[i + 1][j] >= matrix[i][j + 1]) {
      operations.push({ type: 'remove', line: left[i] });
      i += 1;
    } else {
      operations.push({ type: 'add', line: right[j] });
      j += 1;
    }
  }

  while (i < left.length) {
    operations.push({ type: 'remove', line: left[i++] });
  }

  while (j < right.length) {
    operations.push({ type: 'add', line: right[j++] });
  }

  return operations;
}

function renderDiff(filePath: string, before: string, after: string): string {
  if (before === after) {
    return `No changes: ${filePath}`;
  }

  const left = before.split('\n');
  const right = after.split('\n');
  if ((left.length + 1) * (right.length + 1) > MAX_DIFF_MATRIX_CELLS) {
    return [
      `--- ${filePath}`,
      `+++ ${filePath}`,
      `# qml-ng diff fallback: file too large for detailed line diff (${left.length} -> ${right.length} lines)`
    ].join('\n');
  }

  const diff = diffLines(left, right)
    .map(operation => {
      const prefix = operation.type === 'equal'
        ? ' '
        : operation.type === 'add'
          ? '+'
          : '-';
      return `${prefix}${operation.line}`;
    })
    .join('\n');

  return [`--- ${filePath}`, `+++ ${filePath}`, diff].join('\n');
}

function writeGeneratedFiles(result: FileConversionResult, outputDir: string): void {
  for (const generatedFile of result.generatedFiles) {
    const destination = path.join(outputDir, generatedFile.relativePath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, generatedFile.content, 'utf8');
    console.log(`Wrote ${destination}`);
  }
}

function printGeneratedFilePlan(result: FileConversionResult, outputDir?: string): void {
  for (const generatedFile of result.generatedFiles) {
    const destination = outputDir
      ? path.join(outputDir, generatedFile.relativePath)
      : generatedFile.relativePath;
    console.log(`Would write ${destination}`);
  }
}

function printGeneratedFileDiffs(result: FileConversionResult, outputDir: string): void {
  for (const generatedFile of result.generatedFiles) {
    const destination = path.join(outputDir, generatedFile.relativePath);
    console.log(renderDiff(destination, readExistingFile(destination), generatedFile.content));
  }
}

function printSingleFileOutput(result: FileConversionResult): void {
  console.log('----- TS -----');
  console.log(result.rendered.ts);
  console.log('----- HTML -----');
  console.log(result.rendered.html);
  console.log('----- SCSS -----');
  console.log(result.rendered.scss);
  console.log('----- DIAGNOSTICS -----');
  console.log(formatDiagnostics(result.diagnostics).join('\n') || 'None');
}

function printBatchResult(result: FileConversionResult, verbose: boolean): void {
  const counts = countDiagnosticsBySeverity(result.diagnostics);
  console.log(
    `${result.status.toUpperCase()} ${result.relativeSourcePath} (${formatDiagnosticCounts(counts)})`
  );

  if (verbose && result.diagnostics.length > 0) {
    for (const diagnostic of formatDiagnostics(result.diagnostics)) {
      console.log(`  ${diagnostic}`);
    }
  }
}

function finalizeStrictMode(results: FileConversionResult[], strict: boolean): void {
  if (!strict) {
    return;
  }

  const failures = results.filter(result => result.strictViolation);
  if (failures.length === 0) {
    return;
  }

  console.error(`Strict mode failed: ${failures.length} file(s) contain unsupported features or errors.`);
  throw new Error('CLI_STRICT_MODE_FAILED');
}

export function runCli(argv: string[]): number {
  const options = parseArgs(argv);

  if (!options) {
    printUsage();
    return 1;
  }

  try {
    options.componentName = options.componentName ? ensureOptionValue(options.componentName, '--name') : undefined;
    options.outputDir = options.outputDir ? ensureOptionValue(options.outputDir, '--output-dir') : undefined;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printUsage();
    return 1;
  }

  if (options.diff && !options.outputDir) {
    console.error('--diff requires --output-dir so qml-ng can compare against generated files on disk.');
    return 1;
  }

  const inputPath = path.resolve(options.inputPath);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input not found: ${inputPath}`);
    return 1;
  }

  try {
    const stat = fs.statSync(inputPath);
    const isBatch = options.batch || stat.isDirectory();

    if (isBatch) {
      const batchDir = stat.isDirectory() ? inputPath : path.dirname(inputPath);
      const results = stat.isDirectory()
        ? convertDirectory(batchDir, options.recursive)
        : collectQmlFiles(batchDir, options.recursive)
          .filter(filePath => filePath === inputPath)
          .map(filePath => convertQmlFile(filePath, { rootDir: batchDir }));

      for (const result of results) {
        printBatchResult(result, options.verbose);
        if (options.diff && options.outputDir) {
          printGeneratedFileDiffs(result, options.outputDir);
          continue;
        }

        if (options.dryRun || !options.outputDir) {
          printGeneratedFilePlan(result, options.outputDir);
          continue;
        }

        writeGeneratedFiles(result, options.outputDir);
      }

      console.log(formatBatchSummary(summarizeBatch(results)));
      finalizeStrictMode(results, options.strict);
      return 0;
    }

    const inferredComponentName = path.basename(inputPath).replace(/(\.ui)?\.qml$/, '');
    const componentName = options.componentName ?? (inferredComponentName || dasherize(inputPath));
    const result = convertQmlFile(inputPath, { componentName, rootDir: path.dirname(inputPath) });

    if (options.diff && options.outputDir) {
      printGeneratedFileDiffs(result, options.outputDir);
    } else if (options.dryRun || options.outputDir) {
      if (!options.dryRun && options.outputDir) {
        writeGeneratedFiles(result, options.outputDir);
      } else {
        printGeneratedFilePlan(result, options.outputDir);
      }
      console.log(formatDiagnostics(result.diagnostics).join('\n') || 'None');
    } else {
      printSingleFileOutput(result);
    }

    finalizeStrictMode([result], options.strict);
    return 0;
  } catch (error) {
    if (error instanceof Error && error.message === 'CLI_STRICT_MODE_FAILED') {
      return 1;
    }

    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (require.main === module) {
  process.exit(runCli(process.argv.slice(2)));
}
