import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function readProjectEntries(projectFile) {
  const source = fs.readFileSync(projectFile, 'utf8');
  const mainFile = source.match(/^\s*mainFile:\s*"([^"]+)"/m)?.[1];
  const mainUiFile = source.match(/^\s*mainUiFile:\s*"([^"]+)"/m)?.[1];

  if (!mainFile || !mainUiFile) {
    throw new Error(`Could not read mainFile/mainUiFile from ${projectFile}`);
  }

  return { mainFile, mainUiFile };
}

function collectQmlFiles(rootDir, files = []) {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      collectQmlFiles(fullPath, files);
      continue;
    }

    if (entry.isFile() && (entry.name.endsWith('.qml') || entry.name.endsWith('.ui.qml'))) {
      files.push(fullPath);
    }
  }

  return files;
}

function findNodeByType(node, typeName) {
  if (node.typeName === typeName) {
    return node;
  }

  for (const child of node.children ?? []) {
    const found = findNodeByType(child, typeName);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function componentTypeFromUiFile(uiFile) {
  return path.basename(uiFile).replace(/\.ui\.qml$/, '');
}

async function loadBuiltModules() {
  const parser = await import(pathToFileURL(path.join(repoRoot, 'dist', 'lib', 'qml', 'parser.js')).href);
  const resolver = await import(pathToFileURL(path.join(repoRoot, 'dist', 'lib', 'qml', 'qml-resolution.js')).href);
  return {
    parseQml: parser.parseQml,
    collectResolvedQmlDependencies: resolver.collectResolvedQmlDependencies
  };
}

function validateParsedFile(parseQml, filePath, projectRoot) {
  parseQml(fs.readFileSync(filePath, 'utf8'), {
    filePath,
    searchRoots: [projectRoot]
  });
}

function validateProject(mods, projectName, projectFile) {
  const projectDir = path.dirname(projectFile);
  const { mainFile, mainUiFile } = readProjectEntries(projectFile);
  const allFiles = collectQmlFiles(projectDir).sort((a, b) => a.localeCompare(b));
  const failures = [];

  for (const filePath of allFiles) {
    try {
      validateParsedFile(mods.parseQml, filePath, projectDir);
    } catch (error) {
      failures.push({
        filePath,
        error: String(error?.message ?? error)
      });
    }
  }

  const mainFilePath = path.join(projectDir, mainFile);
  const expectedRootType = componentTypeFromUiFile(mainUiFile);
  const mainDocument = mods.parseQml(fs.readFileSync(mainFilePath, 'utf8'), {
    filePath: mainFilePath,
    searchRoots: [projectDir]
  });
  const mainAppNode = findNodeByType(mainDocument.root, expectedRootType);

  if (!mainAppNode) {
    failures.push({
      filePath: mainFilePath,
      error: `Missing ${expectedRootType} node in parsed document`
    });
  } else {
    const expectedMainApp = path.join(projectDir, mainUiFile);
    if (path.normalize(mainAppNode.resolvedSourcePath ?? '') !== path.normalize(expectedMainApp)) {
      failures.push({
        filePath: mainFilePath,
        error: `Expected ${expectedRootType} to resolve to ${expectedMainApp}, got ${mainAppNode.resolvedSourcePath ?? 'undefined'}`
      });
    }
  }

  const reachable = new Set([
    ...mods.collectResolvedQmlDependencies(mainFilePath, { searchRoots: [projectDir] }),
    ...mods.collectResolvedQmlDependencies(path.join(projectDir, mainUiFile), { searchRoots: [projectDir] })
  ]);

  return {
    projectName,
    projectFile,
    fileCount: allFiles.length,
    mainFile,
    mainUiFile,
    reachable: [...reachable].sort((a, b) => a.localeCompare(b)),
    failures
  };
}

const mods = await loadBuiltModules();

const projects = [
  {
    name: 'FigmaVariants',
    projectFile: path.join(repoRoot, 'examples', 'FigmaVariants', 'FigmaVariants.qmlproject')
  },
  {
    name: 'WebinarDemo',
    projectFile: path.join(repoRoot, 'examples', 'WebinarDemo', 'WebinarDemo.qmlproject')
  }
];

const results = projects.map(project => validateProject(mods, project.name, project.projectFile));
const failures = results.flatMap(result =>
  result.failures.map(failure => ({
    projectName: result.projectName,
    ...failure
  }))
);

for (const result of results) {
  console.log(
    `Validated ${result.fileCount} QML files in ${result.projectName} ` +
      `(${result.mainFile}, ${result.mainUiFile}).`
  );
  console.log(`Reachable dependency count: ${result.reachable.length}`);
}

if (failures.length) {
  const message = failures
    .map(failure => `${failure.projectName}: ${failure.filePath}\n  ${failure.error}`)
    .join('\n');
  throw new Error(`Recursive parser validation failed:\n${message}`);
}

console.log('Validation passed.');
