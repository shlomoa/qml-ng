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

function assertContains(text, snippet, label) {
  if (!text.includes(snippet)) {
    throw new Error(`Expected ${label} to contain:\n${snippet}`);
  }
}

function assertNotContains(text, snippet, label) {
  if (text.includes(snippet)) {
    throw new Error(`Expected ${label} not to contain:\n${snippet}`);
  }
}

async function loadBuiltModules() {
  const parser = await import(pathToFileURL(path.join(repoRoot, 'dist', 'lib', 'qml', 'parser.js')).href);
  const resolver = await import(pathToFileURL(path.join(repoRoot, 'dist', 'lib', 'qml', 'qml-resolution.js')).href);
  const converter = await import(pathToFileURL(path.join(repoRoot, 'dist', 'lib', 'converter', 'qml-to-ui.js')).href);
  const renderer = await import(pathToFileURL(path.join(repoRoot, 'dist', 'lib', 'angular', 'material-renderer.js')).href);
  return {
    parseQml: parser.parseQml,
    collectResolvedQmlDependencies: resolver.collectResolvedQmlDependencies,
    qmlToUiDocument: converter.qmlToUiDocument,
    renderAngularMaterial: renderer.renderAngularMaterial
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

function validateLayoutSamples(mods) {
  const cases = [
    {
      label: 'column layout sample',
      source: `ColumnLayout {\n  Text { text: "A" }\n}`,
      componentName: 'column-layout-sample',
      className: 'ColumnLayoutSampleComponent',
      htmlContains: ['class="qml-column-layout"']
    },
    {
      label: 'row layout sample',
      source: `RowLayout {\n  Text { text: "A" }\n}`,
      componentName: 'row-layout-sample',
      className: 'RowLayoutSampleComponent',
      htmlContains: ['class="qml-row-layout"']
    },
    {
      label: 'grid layout sample',
      source: `GridLayout {\n  Text { text: "A" }\n  Text { text: "B" }\n}`,
      componentName: 'grid-layout-sample',
      className: 'GridLayoutSampleComponent',
      htmlContains: ['class="qml-grid-layout"']
    },
    {
      label: 'flexbox layout sample',
      source: `FlexboxLayout {\n  Text { text: "A" }\n  Text { text: "B" }\n}`,
      componentName: 'flexbox-layout-sample',
      className: 'FlexboxLayoutSampleComponent',
      htmlContains: ['class="qml-flexbox-layout"']
    }
  ];

  for (const testCase of cases) {
    const document = mods.qmlToUiDocument(
      testCase.componentName,
      mods.parseQml(testCase.source)
    );
    const rendered = mods.renderAngularMaterial(document, testCase.className);
    for (const snippet of testCase.htmlContains) {
      assertContains(rendered.html, snippet, `${testCase.label} HTML`);
    }
    assertNotContains(rendered.html, 'Unsupported node:', `${testCase.label} HTML`);
  }
}

function validateRenderedFile(mods, testCase) {
  const source = fs.readFileSync(testCase.filePath, 'utf8');
  const document = mods.qmlToUiDocument(
    testCase.componentName,
    mods.parseQml(source, {
      filePath: testCase.filePath,
      searchRoots: [path.dirname(path.dirname(testCase.filePath))]
    })
  );
  const rendered = mods.renderAngularMaterial(document, testCase.className);
  assertContains(rendered.html, `<div class="`, `${testCase.label} HTML`);

  for (const snippet of testCase.htmlContains ?? []) {
    assertContains(rendered.html, snippet, `${testCase.label} HTML`);
  }

  for (const snippet of testCase.htmlNotContains ?? []) {
    assertNotContains(rendered.html, snippet, `${testCase.label} HTML`);
  }

  for (const snippet of testCase.diagnosticsContains ?? []) {
    const diagnosticsText = document.diagnostics.map(d => d.message).join('\n') || 'None';
    assertContains(diagnosticsText, snippet, `${testCase.label} diagnostics`);
  }

  for (const snippet of testCase.diagnosticsNotContains ?? []) {
    const diagnosticsText = document.diagnostics.map(d => d.message).join('\n') || 'None';
    assertNotContains(diagnosticsText, snippet, `${testCase.label} diagnostics`);
  }
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

const renderedCases = [
  {
    label: 'webinar app shell renders window',
    filePath: path.join(repoRoot, 'examples', 'WebinarDemo', 'WebinarDemoContent', 'App.qml'),
    componentName: 'webinar-demo-app',
    className: 'WebinarDemoAppComponent',
    htmlContains: ['class="qml-window"'],
    htmlNotContains: ['Unsupported node: Window'],
    diagnosticsNotContains: ['Unsupported QML type: Window']
  },
  {
    label: 'webinar stacked view renders image and stack layout',
    filePath: path.join(repoRoot, 'examples', 'WebinarDemo', 'WebinarDemoContent', 'MainApp.ui.qml'),
    componentName: 'webinar-main-app',
    className: 'WebinarMainAppComponent',
    htmlContains: ['class="qml-stack-layout"', 'class="qml-image"'],
    htmlNotContains: ['Unsupported node: StackLayout', 'Unsupported node: Image'],
    diagnosticsNotContains: ['Unsupported QML type: StackLayout', 'Unsupported QML type: Image']
  },
  {
    label: 'webinar popup keyframes are ignored',
    filePath: path.join(repoRoot, 'examples', 'WebinarDemo', 'WebinarDemoContent', 'Smallpopup.ui.qml'),
    componentName: 'webinar-smallpopup',
    className: 'WebinarSmallpopupComponent',
    diagnosticsNotContains: ['Unsupported QML type: KeyframeGroup']
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

for (const testCase of renderedCases) {
  console.log(`Rendering ${testCase.label}...`);
  validateRenderedFile(mods, testCase);
}

console.log('Rendering layout samples...');
validateLayoutSamples(mods);

if (failures.length) {
  const message = failures
    .map(failure => `${failure.projectName}: ${failure.filePath}\n  ${failure.error}`)
    .join('\n');
  throw new Error(`Recursive parser validation failed:\n${message}`);
}

console.log('Validation passed.');
