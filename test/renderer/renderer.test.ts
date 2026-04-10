import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseQml } from '../../dist/lib/qml/parser.js';
import { qmlToUiDocument } from '../../dist/lib/converter/qml-to-ui.js';
import { renderAngularMaterial } from '../../dist/lib/angular/material-renderer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GOLDEN_DIR = path.join(__dirname, '../golden');
const UPDATE_GOLDEN = process.env.UPDATE_GOLDEN === 'true';

function ensureGoldenDir() {
  if (!fs.existsSync(GOLDEN_DIR)) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  }
}

function readGolden(name: string, ext: string): string | null {
  const filepath = path.join(GOLDEN_DIR, `${name}.${ext}`);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  return fs.readFileSync(filepath, 'utf-8');
}

function writeGolden(name: string, ext: string, content: string) {
  ensureGoldenDir();
  const filepath = path.join(GOLDEN_DIR, `${name}.${ext}`);
  fs.writeFileSync(filepath, content, 'utf-8');
}

function checkGolden(testName: string, actual: string, ext: string) {
  const golden = readGolden(testName, ext);

  if (UPDATE_GOLDEN || golden === null) {
    writeGolden(testName, ext, actual);
    if (golden === null) {
      console.log(`Created golden file: ${testName}.${ext}`);
    } else {
      console.log(`Updated golden file: ${testName}.${ext}`);
    }
  } else {
    assert.equal(
      actual.trim(),
      golden.trim(),
      `Output does not match golden file ${testName}.${ext}. Run with UPDATE_GOLDEN=true to update.`
    );
  }
}

describe('Renderer Golden Files', () => {
  describe('Basic Controls', () => {
    test('should render simple Text component', () => {
      const qml = parseQml('Text { text: "Hello World" }');
      const ui = qmlToUiDocument('simple-text', qml);
      const rendered = renderAngularMaterial(ui, 'SimpleTextComponent');

      checkGolden('simple-text', rendered.ts, 'component.ts');
      checkGolden('simple-text', rendered.html, 'component.html');
      checkGolden('simple-text', rendered.scss, 'component.scss');
    });

    test('should render simple Button component', () => {
      const qml = parseQml('Button { text: "Click Me" onClicked: doSomething() }');
      const ui = qmlToUiDocument('simple-button', qml);
      const rendered = renderAngularMaterial(ui, 'SimpleButtonComponent');

      checkGolden('simple-button', rendered.ts, 'component.ts');
      checkGolden('simple-button', rendered.html, 'component.html');
      checkGolden('simple-button', rendered.scss, 'component.scss');
    });

    test('should render TextField component', () => {
      const qml = parseQml('TextField { placeholderText: "Enter email" }');
      const ui = qmlToUiDocument('text-field', qml);
      const rendered = renderAngularMaterial(ui, 'TextFieldComponent');

      checkGolden('text-field', rendered.ts, 'component.ts');
      checkGolden('text-field', rendered.html, 'component.html');
      checkGolden('text-field', rendered.scss, 'component.scss');
    });

    test('should render Image component', () => {
      const qml = parseQml('Image { source: "logo.png" }');
      const ui = qmlToUiDocument('image', qml);
      const rendered = renderAngularMaterial(ui, 'ImageComponent');

      checkGolden('image', rendered.ts, 'component.ts');
      checkGolden('image', rendered.html, 'component.html');
      checkGolden('image', rendered.scss, 'component.scss');
    });
  });

  describe('Layout Containers', () => {
    test('should render Column layout', () => {
      const qml = parseQml(`
Column {
  Text { text: "Title" }
  Button { text: "Click" }
}`);
      const ui = qmlToUiDocument('column-layout', qml);
      const rendered = renderAngularMaterial(ui, 'ColumnLayoutComponent');

      checkGolden('column-layout', rendered.ts, 'component.ts');
      checkGolden('column-layout', rendered.html, 'component.html');
      checkGolden('column-layout', rendered.scss, 'component.scss');
    });

    test('should render Row layout', () => {
      const qml = parseQml(`
Row {
  Button { text: "OK" }
  Button { text: "Cancel" }
}`);
      const ui = qmlToUiDocument('row-layout', qml);
      const rendered = renderAngularMaterial(ui, 'RowLayoutComponent');

      checkGolden('row-layout', rendered.ts, 'component.ts');
      checkGolden('row-layout', rendered.html, 'component.html');
      checkGolden('row-layout', rendered.scss, 'component.scss');
    });

    test('should render nested layouts', () => {
      const qml = parseQml(`
Column {
  Row {
    Text { text: "A" }
    Text { text: "B" }
  }
  Row {
    Button { text: "C" }
    Button { text: "D" }
  }
}`);
      const ui = qmlToUiDocument('nested-layout', qml);
      const rendered = renderAngularMaterial(ui, 'NestedLayoutComponent');

      checkGolden('nested-layout', rendered.ts, 'component.ts');
      checkGolden('nested-layout', rendered.html, 'component.html');
      checkGolden('nested-layout', rendered.scss, 'component.scss');
    });
  });

  describe('Bindings', () => {
    test('should render with expression binding', () => {
      const qml = parseQml('Text { text: user.name }');
      const ui = qmlToUiDocument('expression-binding', qml);
      const rendered = renderAngularMaterial(ui, 'ExpressionBindingComponent');

      checkGolden('expression-binding', rendered.ts, 'component.ts');
      checkGolden('expression-binding', rendered.html, 'component.html');

      // Verify computed is generated
      assert.ok(rendered.ts.includes('computed('));
      assert.ok(rendered.ts.includes('signal'));
    });

    test('should render with multiple dependencies', () => {
      const qml = parseQml(`
Column {
  Text { text: user.firstName }
  Text { text: user.lastName }
}`);
      const ui = qmlToUiDocument('multi-dependency', qml);
      const rendered = renderAngularMaterial(ui, 'MultiDependencyComponent');

      checkGolden('multi-dependency', rendered.ts, 'component.ts');
      checkGolden('multi-dependency', rendered.html, 'component.html');

      // Verify only one signal for 'user' dependency
      const userSignalCount = (rendered.ts.match(/readonly user = signal/g) || []).length;
      assert.equal(userSignalCount, 1);
    });
  });

  describe('Layout Anchors', () => {
    test('should render with anchors.fill', () => {
      const qml = parseQml('Item { anchors.fill: parent Text { text: "Filled" } }');
      const ui = qmlToUiDocument('anchors-fill', qml);
      const rendered = renderAngularMaterial(ui, 'AnchorsFillComponent');

      checkGolden('anchors-fill', rendered.ts, 'component.ts');
      checkGolden('anchors-fill', rendered.html, 'component.html');
      checkGolden('anchors-fill', rendered.scss, 'component.scss');
    });

    test('should render with anchors.centerIn', () => {
      const qml = parseQml('Column { anchors.centerIn: parent Text { text: "Centered" } }');
      const ui = qmlToUiDocument('anchors-center', qml);
      const rendered = renderAngularMaterial(ui, 'AnchorsCenterComponent');

      checkGolden('anchors-center', rendered.ts, 'component.ts');
      checkGolden('anchors-center', rendered.html, 'component.html');
      checkGolden('anchors-center', rendered.scss, 'component.scss');
    });
  });

  describe('Complete Examples', () => {
    test('should render login form (login.qml)', () => {
      const qml = parseQml(`
Column {
  anchors.centerIn: parent

  Text {
    text: user.name
  }

  TextField {
    placeholderText: "Email"
  }

  Button {
    text: "Submit"
    onClicked: submit()
  }
}`);
      const ui = qmlToUiDocument('login-form', qml);
      const rendered = renderAngularMaterial(ui, 'LoginFormComponent');

      checkGolden('login-form', rendered.ts, 'component.ts');
      checkGolden('login-form', rendered.html, 'component.html');
      checkGolden('login-form', rendered.scss, 'component.scss');

      // Verify structure
      assert.ok(rendered.html.includes('qml-column'));
      assert.ok(rendered.html.includes('<span'));
      assert.ok(rendered.html.includes('<mat-form-field'));
      assert.ok(rendered.html.includes('<button mat-raised-button'));
      assert.ok(rendered.ts.includes('MatButtonModule'));
      assert.ok(rendered.ts.includes('MatFormFieldModule'));
      assert.ok(rendered.ts.includes('MatInputModule'));
    });
  });

  describe('Import Generation', () => {
    test('should generate correct Material imports for Button', () => {
      const qml = parseQml('Button { text: "Click" }');
      const ui = qmlToUiDocument('test', qml);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.ts.includes('MatButtonModule'));
      assert.ok(rendered.ts.includes("from '@angular/material/button'"));
    });

    test('should generate correct Material imports for TextField', () => {
      const qml = parseQml('TextField { }');
      const ui = qmlToUiDocument('test', qml);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.ts.includes('MatFormFieldModule'));
      assert.ok(rendered.ts.includes('MatInputModule'));
    });

    test('should generate minimal imports when no controls used', () => {
      const qml = parseQml('Column { Text { text: "Hello" } }');
      const ui = qmlToUiDocument('test', qml);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(!rendered.ts.includes('MatButtonModule'));
      assert.ok(!rendered.ts.includes('MatFormFieldModule'));
    });
  });

  describe('Signal and Computed Generation', () => {
    test('should not generate signals when no expressions', () => {
      const qml = parseQml('Text { text: "Static" }');
      const ui = qmlToUiDocument('test', qml);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(!rendered.ts.includes('signal<any>'));
    });

    test('should generate signals for expression dependencies', () => {
      const qml = parseQml('Text { text: data.value }');
      const ui = qmlToUiDocument('test', qml);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.ts.includes('readonly data = signal<any>'));
    });

    test('should generate computed for expressions', () => {
      const qml = parseQml('Text { text: user.name }');
      const ui = qmlToUiDocument('test', qml);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.ts.includes('computed(() =>'));
    });
  });

  describe('Deterministic Output', () => {
    test('should produce stable output for same input', () => {
      const qml = 'Text { text: "Hello" }';
      const parsed1 = parseQml(qml);
      const ui1 = qmlToUiDocument('test', parsed1);
      const rendered1 = renderAngularMaterial(ui1, 'TestComponent');

      const parsed2 = parseQml(qml);
      const ui2 = qmlToUiDocument('test', parsed2);
      const rendered2 = renderAngularMaterial(ui2, 'TestComponent');

      assert.equal(rendered1.ts, rendered2.ts);
      assert.equal(rendered1.html, rendered2.html);
      assert.equal(rendered1.scss, rendered2.scss);
    });

    test('should sort dependencies deterministically', () => {
      const qml = parseQml(`
Column {
  Text { text: z.value }
  Text { text: a.value }
  Text { text: m.value }
}`);
      const ui = qmlToUiDocument('test', qml);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Check that signals are declared in alphabetical order
      const signalMatches = rendered.ts.match(/readonly (\w+) = signal/g);
      if (signalMatches && signalMatches.length > 1) {
        const names = signalMatches.map(m => m.match(/readonly (\w+)/)?.[1] || '');
        const sortedNames = [...names].sort();
        assert.deepEqual(names, sortedNames);
      }
    });
  });
});
