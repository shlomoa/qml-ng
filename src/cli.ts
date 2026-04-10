import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderAngularMaterial } from './lib/angular/material-renderer';
import { qmlToUiDocument } from './lib/converter/qml-to-ui';
import { parseQml } from './lib/qml/parser';
import { formatDiagnostics } from './lib/diagnostics/formatter';

interface CliOptions {
  name?: string;
  dryRun: boolean;
  diff: boolean;
  strict: boolean;
  verbose: boolean;
  outputDir?: string;
}

function parseArgs(args: string[]): { inputFile: string; options: CliOptions } {
  const options: CliOptions = {
    dryRun: false,
    diff: false,
    strict: false,
    verbose: false
  };

  let inputFile = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--name' && i + 1 < args.length) {
      options.name = args[++i];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--diff') {
      options.diff = true;
    } else if (arg === '--strict') {
      options.strict = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--output-dir' && i + 1 < args.length) {
      options.outputDir = args[++i];
    } else if (!inputFile && !arg.startsWith('--')) {
      inputFile = arg;
    }
  }

  return { inputFile, options };
}

function pascalCase(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function printUsage(): void {
  console.log(`Usage: qml-ng <input.qml> [options]

Options:
  --name <name>         Component name (default: basename of input file)
  --output-dir <dir>    Output directory for generated files
  --dry-run             Show output without writing files
  --diff                Show changes that would be made (implies --dry-run)
  --strict              Exit with error if there are any unsupported features
  --verbose, -v         Show detailed diagnostics
  --help, -h            Show this help message

Examples:
  qml-ng input.qml --name MyComponent
  qml-ng input.qml --dry-run
  qml-ng input.qml --strict --verbose
`);
}

const [, , ...args] = process.argv;

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const { inputFile, options } = parseArgs(args);

if (!inputFile) {
  console.error('Error: No input file specified');
  printUsage();
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

const rawName = options.name || path.basename(inputFile, '.qml');
const componentName = rawName || 'qml-component';

try {
  const qml = fs.readFileSync(inputFile, 'utf-8');
  const document = qmlToUiDocument(componentName, parseQml(qml), inputFile);
  const rendered = renderAngularMaterial(document, `${pascalCase(componentName)}Component`);

  // Check for errors in strict mode
  if (options.strict) {
    const errors = document.diagnostics.filter(d => d.severity === 'error');
    const warnings = document.diagnostics.filter(d => d.severity === 'warning');
    if (errors.length > 0 || warnings.length > 0) {
      console.error('\n----- DIAGNOSTICS -----');
      console.error(formatDiagnostics(document.diagnostics, { verbose: options.verbose }));
      console.error('\nStrict mode: Conversion failed due to unsupported features');
      process.exit(1);
    }
  }

  // In dry-run or diff mode, just show the output
  if (options.dryRun || options.diff) {
    if (options.diff) {
      console.log(`\nWould generate the following files for ${componentName}:\n`);
    }

    console.log('----- TypeScript (.ts) -----');
    console.log(rendered.ts);
    console.log('\n----- HTML (.html) -----');
    console.log(rendered.html);
    console.log('\n----- SCSS (.scss) -----');
    console.log(rendered.scss);

    if (document.diagnostics.length > 0) {
      console.log('\n----- DIAGNOSTICS -----');
      console.log(formatDiagnostics(document.diagnostics, { verbose: options.verbose }));
    }

    if (options.diff) {
      console.log(`\nDry-run mode: No files were written`);
    }
  } else {
    // Normal mode: write files if output directory is specified
    if (options.outputDir) {
      const outputDir = path.resolve(options.outputDir);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const baseName = `${componentName}.component`;
      fs.writeFileSync(path.join(outputDir, `${baseName}.ts`), rendered.ts);
      fs.writeFileSync(path.join(outputDir, `${baseName}.html`), rendered.html);
      fs.writeFileSync(path.join(outputDir, `${baseName}.scss`), rendered.scss);

      console.log(`Generated files in ${outputDir}:`);
      console.log(`  - ${baseName}.ts`);
      console.log(`  - ${baseName}.html`);
      console.log(`  - ${baseName}.scss`);
    } else {
      // Default: just print to console
      console.log('----- TS -----');
      console.log(rendered.ts);
      console.log('----- HTML -----');
      console.log(rendered.html);
      console.log('----- SCSS -----');
      console.log(rendered.scss);
    }

    if (document.diagnostics.length > 0 || options.verbose) {
      console.log('\n----- DIAGNOSTICS -----');
      console.log(formatDiagnostics(document.diagnostics, { verbose: options.verbose }));
    }
  }

  // Exit with error if there are errors (even in non-strict mode)
  const errors = document.diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0) {
    process.exit(1);
  }
} catch (error) {
  console.error(`Error processing ${inputFile}:`, error instanceof Error ? error.message : error);
  process.exit(1);
}

