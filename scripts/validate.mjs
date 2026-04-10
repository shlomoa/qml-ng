import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function sanitizeQml(source) {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*import .*$/gm, '')
    .replace(/^\s*property alias .*$/gm, '')
    .replace(/^(\s*)(?:[A-Za-z_][A-Za-z0-9_]*\.)+([A-Za-z_][A-Za-z0-9_]*)\s*\{/gm, '$1$2 {')
    .trim();
}

function pascalCase(name) {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function section(output, name) {
  const header = `----- ${name} -----`;
  const start = output.indexOf(header);
  if (start < 0) {
    throw new Error(`Missing ${name} section`);
  }

  const nextHeaders = ['TS', 'HTML', 'SCSS', 'DIAGNOSTICS']
    .filter(other => other !== name)
    .map(other => `----- ${other} -----`)
    .map(headerText => output.indexOf(headerText, start + header.length))
    .filter(index => index >= 0);

  const end = nextHeaders.length ? Math.min(...nextHeaders) : output.length;
  return output.slice(start + header.length, end).trim();
}

function assertContains(text, snippet, label) {
  if (!text.includes(snippet)) {
    throw new Error(`Expected ${label} to contain:\n${snippet}`);
  }
}

function assertNotNone(diagnostics, label) {
  if (diagnostics === 'None') {
    throw new Error(`Expected ${label} to report diagnostics`);
  }
}

async function loadBuiltModules() {
  const parser = await import(pathToFileURL(path.join(repoRoot, 'dist', 'lib', 'qml', 'parser.js')).href);
  const converter = await import(pathToFileURL(path.join(repoRoot, 'dist', 'lib', 'converter', 'qml-to-ui.js')).href);
  const renderer = await import(pathToFileURL(path.join(repoRoot, 'dist', 'lib', 'angular', 'material-renderer.js')).href);
  return {
    parseQml: parser.parseQml,
    qmlToUiDocument: converter.qmlToUiDocument,
    renderAngularMaterial: renderer.renderAngularMaterial
  };
}

function validateRenderedCase(mods, testCase) {
  const source = sanitizeQml(fs.readFileSync(testCase.filePath, 'utf8'));
  const document = mods.qmlToUiDocument(testCase.componentName, mods.parseQml(source));
  const rendered = mods.renderAngularMaterial(document, testCase.className);
  const output = [
    '----- TS -----',
    rendered.ts,
    '----- HTML -----',
    rendered.html,
    '----- SCSS -----',
    rendered.scss,
    '----- DIAGNOSTICS -----',
    document.diagnostics.join('\n') || 'None'
  ].join('\n');

  const ts = section(output, 'TS');
  const html = section(output, 'HTML');
  const scss = section(output, 'SCSS');
  const diagnostics = section(output, 'DIAGNOSTICS');

  assertContains(output, '----- TS -----', `${testCase.label} output`);
  assertContains(output, '----- HTML -----', `${testCase.label} output`);
  assertContains(output, '----- SCSS -----', `${testCase.label} output`);
  assertContains(output, '----- DIAGNOSTICS -----', `${testCase.label} output`);

  assertContains(ts, `selector: 'app-${testCase.componentName}'`, `${testCase.label} TS section`);
  assertContains(ts, `export class ${testCase.className}`, `${testCase.label} TS section`);

  for (const snippet of testCase.tsContains ?? []) {
    assertContains(ts, snippet, `${testCase.label} TS section`);
  }

  for (const snippet of testCase.htmlContains ?? []) {
    assertContains(html, snippet, `${testCase.label} HTML section`);
  }

  for (const snippet of testCase.scssContains ?? []) {
    assertContains(scss, snippet, `${testCase.label} SCSS section`);
  }

  for (const snippet of testCase.diagnosticsContains ?? []) {
    assertContains(diagnostics, snippet, `${testCase.label} diagnostics`);
  }

  if (testCase.expectDiagnosticsNone) {
    if (diagnostics !== 'None') {
      throw new Error(`Expected ${testCase.label} diagnostics to be None, got:\n${diagnostics}`);
    }
  } else if (testCase.expectDiagnostics) {
    assertNotNone(diagnostics, testCase.label);
  }
}

const mods = await loadBuiltModules();

const cases = [
  {
    label: 'login baseline',
    filePath: path.join(repoRoot, 'examples', 'login.qml'),
    componentName: 'login-form',
    className: 'LoginFormComponent',
    tsContains: [
      "import { Component, computed, signal } from '@angular/core';",
      "import { MatButtonModule } from '@angular/material/button';",
      "import { MatFormFieldModule } from '@angular/material/form-field';",
      "import { MatInputModule } from '@angular/material/input';",
      'readonly user = signal<any>(null);',
      'readonly textExpr1 = computed(() => user().name);'
    ],
    htmlContains: [
      '<div class="qml-column">',
      '<span>{{ textExpr1() }}</span>',
      '<mat-form-field appearance="outline">',
      '<input matInput [placeholder]=',
      'Email',
      '<button mat-raised-button (click)="submit()">{{ "Submit" }}</button>'
    ],
    scssContains: [
      ':host {',
      '  display: block;',
      '.qml-column {',
      '  display: flex;',
      'justify-content: center;',
      'align-items: center;'
    ],
    expectDiagnosticsNone: true
  },
  {
    label: 'figma leaf',
    filePath: path.join(repoRoot, 'examples', 'FigmaVariants', 'Dependencies', 'Components', 'imports', 'compat', 'Extras', 'StaticText.qml'),
    componentName: 'figma-static-text',
    className: 'FigmaStaticTextComponent',
    tsContains: [
      'import { Component, computed } from \'@angular/core\';'
    ],
    htmlContains: [
      '<span>{{ "TODO" }}</span>'
    ],
    expectDiagnosticsNone: true
  },
  {
    label: 'figma main screen',
    filePath: path.join(repoRoot, 'examples', 'FigmaVariants', 'FigmaVariantsContent', 'ScreenDesign.ui.qml'),
    componentName: 'figma-screen-design',
    className: 'FigmaScreenDesignComponent',
    htmlContains: [
      '<div class="qml-unsupported">Unsupported node: Rectangle</div>'
    ],
    diagnosticsContains: [
      'Unsupported QML type: Rectangle',
      'Unsupported QML type: LargeButton',
      'Unsupported QML type: MiniButton',
      'Unsupported QML type: Sequencer',
      'Unsupported QML type: ChannelMixer',
      'Unsupported QML type: Equalizer'
    ],
    expectDiagnostics: true
  },
  {
    label: 'figma app shell',
    filePath: path.join(repoRoot, 'examples', 'FigmaVariants', 'FigmaVariantsContent', 'App.qml'),
    componentName: 'figma-variants-app',
    className: 'FigmaVariantsAppComponent',
    htmlContains: [
      '<div class="qml-unsupported">Unsupported node: Window</div>'
    ],
    diagnosticsContains: [
      'Unsupported QML type: Window',
      'Unsupported QML type: ScreenDesign'
    ],
    expectDiagnostics: true
  },
  {
    label: 'webinar leaf',
    filePath: path.join(repoRoot, 'examples', 'WebinarDemo', 'Dependencies', 'Components', 'imports', 'compat', 'Extras', 'StaticText.qml'),
    componentName: 'webinar-static-text',
    className: 'WebinarStaticTextComponent',
    tsContains: [
      'import { Component, computed } from \'@angular/core\';'
    ],
    htmlContains: [
      '<span>{{ "TODO" }}</span>'
    ],
    expectDiagnosticsNone: true
  },
  {
    label: 'webinar main app',
    filePath: path.join(repoRoot, 'examples', 'WebinarDemo', 'WebinarDemoContent', 'MainApp.ui.qml'),
    componentName: 'webinar-main-app',
    className: 'WebinarMainAppComponent',
    htmlContains: [
      '<div class="qml-unsupported">Unsupported node: Item</div>'
    ],
    diagnosticsContains: [
      'Unsupported QML type: Item',
      'Unsupported QML type: Image',
      'Unsupported QML type: Tabmenu',
      'Unsupported QML type: Leftdrawer',
      'Unsupported QML type: Burgermenu',
      'Unsupported QML type: StackLayout',
      'Unsupported QML type: Largepopup',
      'Unsupported QML type: Squarepopup',
      'Unsupported QML type: Smallpopup',
      'Unsupported QML type: Minimenu'
    ],
    expectDiagnostics: true
  },
  {
    label: 'webinar app shell',
    filePath: path.join(repoRoot, 'examples', 'WebinarDemo', 'WebinarDemoContent', 'App.qml'),
    componentName: 'webinar-demo-app',
    className: 'WebinarDemoAppComponent',
    htmlContains: [
      '<div class="qml-unsupported">Unsupported node: Window</div>'
    ],
    diagnosticsContains: [
      'Unsupported QML type: Window',
      'Unsupported QML type: MainApp'
    ],
    expectDiagnostics: true
  }
];

for (const testCase of cases) {
  console.log(`Validating ${testCase.label}...`);
  validateRenderedCase(mods, testCase);
}

console.log('Validation passed.');
