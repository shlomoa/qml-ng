import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const testDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(testDir, '..');
const distRoot = path.join(repoRoot, 'dist');

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n');
}

export async function loadBuiltModules() {
  const [indexModule, rendererModule, qmlComponentModule, qmlBatchModule] = await Promise.all([
    import(pathToFileURL(path.join(distRoot, 'index.js')).href),
    import(pathToFileURL(path.join(distRoot, 'lib', 'angular', 'material-renderer.js')).href),
    import(pathToFileURL(path.join(distRoot, 'schematics', 'qml-component', 'index.js')).href),
    import(pathToFileURL(path.join(distRoot, 'schematics', 'qml-batch', 'index.js')).href)
  ]);

  return {
    ...indexModule,
    ...rendererModule,
    ...qmlComponentModule,
    ...qmlBatchModule
  };
}

export function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

export async function renderQml({
  source,
  filePath,
  componentName,
  className
}) {
  const modules = await loadBuiltModules();
  const absoluteFilePath = filePath ? path.join(repoRoot, filePath) : undefined;
  const qmlSource = source ?? readRepoFile(filePath);
  const parsed = modules.parseQml(qmlSource, absoluteFilePath ? {
    filePath: absoluteFilePath,
    searchRoots: [path.dirname(absoluteFilePath), path.dirname(path.dirname(absoluteFilePath))]
  } : undefined);
  const document = modules.qmlToUiDocument(componentName, parsed, absoluteFilePath);
  const rendered = modules.renderAngularMaterial(document, className);
  return { document, rendered };
}

export function assertSnapshot(relativePath, actual) {
  const snapshotPath = path.join(repoRoot, 'test', '__snapshots__', relativePath);
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  const normalized = normalizeText(actual);

  if (process.env.UPDATE_SNAPSHOTS === '1' || !fs.existsSync(snapshotPath)) {
    fs.writeFileSync(snapshotPath, normalized);
  }

  const expected = normalizeText(fs.readFileSync(snapshotPath, 'utf8'));
  assert.strictEqual(normalized, expected, `Snapshot mismatch for ${relativePath}`);
}

export function compileGeneratedComponent(componentName, rendered) {
  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qml-ng-generated-component-'));
    const componentBase = path.join(tmpDir, `${componentName}.component`);

    fs.writeFileSync(`${componentBase}.ts`, rendered.ts);
    fs.writeFileSync(`${componentBase}.html`, rendered.html);
    fs.writeFileSync(`${componentBase}.scss`, rendered.scss);

    const stubModules = {
      '@angular/core': `
export interface Signal<T> { (): T; set(value: T): void; update(fn: (value: T) => T): void; }
export declare function Component(metadata: unknown): ClassDecorator;
export declare function computed<T>(fn: () => T): () => T;
export declare function signal<T>(value: T): Signal<T>;
`,
      '@angular/material/button': 'export declare class MatButtonModule {}',
      '@angular/material/form-field': 'export declare class MatFormFieldModule {}',
      '@angular/material/input': 'export declare class MatInputModule {}'
    };

    for (const [moduleName, contents] of Object.entries(stubModules)) {
      const moduleDir = path.join(tmpDir, 'node_modules', ...moduleName.split('/'));
      fs.mkdirSync(moduleDir, { recursive: true });
      fs.writeFileSync(path.join(moduleDir, 'index.d.ts'), contents.trimStart());
    }

    fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'CommonJS',
        moduleResolution: 'Node10',
        experimentalDecorators: true,
        strict: true,
        skipLibCheck: true,
        noEmit: true
      },
      include: ['**/*.ts', '**/*.d.ts']
    }, null, 2));

    const configPath = path.join(tmpDir, 'tsconfig.json');
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, tmpDir, undefined, configPath);
    const program = ts.createProgram({
      rootNames: parsedConfig.fileNames,
      options: parsedConfig.options
    });
    const diagnostics = [
      ...(configFile.error ? [configFile.error] : []),
      ...parsedConfig.errors,
      ...ts.getPreEmitDiagnostics(program)
    ];

    if (diagnostics.length > 0) {
      const formatHost = {
        getCanonicalFileName: fileName => fileName,
        getCurrentDirectory: () => tmpDir,
        getNewLine: () => '\n'
      };
      throw new Error(`Generated component failed to compile:\n${ts.formatDiagnostics(diagnostics, formatHost)}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Generated component failed to compile:\n')) {
      throw error;
    }
    throw new Error(`Generated component failed to compile:\n${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
}

export function createTestLogger() {
  const messages = [];
  return {
    messages,
    logger: {
      info(message) {
        messages.push({ level: 'info', message });
      },
      warn(message) {
        messages.push({ level: 'warn', message });
      },
      error(message) {
        messages.push({ level: 'error', message });
      }
    }
  };
}
