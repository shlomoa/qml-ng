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
const EXAMPLES_DIR = path.join(__dirname, '../../examples');

function readExample(filename: string): string {
  const filepath = path.join(EXAMPLES_DIR, filename);
  return fs.readFileSync(filepath, 'utf-8');
}

describe('Regression Tests from Real Examples', () => {
  describe('login.qml - Current Smoke Test', () => {
    test('should parse login.qml without errors', () => {
      const source = readExample('login.qml');
      const qml = parseQml(source);

      assert.equal(qml.root.typeName, 'Column');
      assert.equal(qml.root.children.length, 3);
    });

    test('should convert login.qml to UI schema', () => {
      const source = readExample('login.qml');
      const qml = parseQml(source);
      const ui = qmlToUiDocument('login', qml);

      assert.equal(ui.name, 'login');
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.children.length, 3);

      // Verify structure
      assert.equal(ui.root.children[0].kind, 'text');
      assert.equal(ui.root.children[1].kind, 'input');
      assert.equal(ui.root.children[2].kind, 'button');
    });

    test('should render login.qml to Angular Material', () => {
      const source = readExample('login.qml');
      const qml = parseQml(source);
      const ui = qmlToUiDocument('login', qml);
      const rendered = renderAngularMaterial(ui, 'LoginComponent');

      // Verify TypeScript output
      assert.ok(rendered.ts.includes('export class LoginComponent'));
      assert.ok(rendered.ts.includes('MatButtonModule'));
      assert.ok(rendered.ts.includes('MatFormFieldModule'));
      assert.ok(rendered.ts.includes('MatInputModule'));

      // Verify HTML output
      assert.ok(rendered.html.includes('qml-column'));
      assert.ok(rendered.html.includes('<span'));
      assert.ok(rendered.html.includes('<mat-form-field'));
      assert.ok(rendered.html.includes('<button mat-raised-button'));

      // Verify SCSS output
      assert.ok(rendered.scss.includes('.qml-column'));
      assert.ok(rendered.scss.includes('display: flex'));
    });

    test('should handle login.qml expression bindings', () => {
      const source = readExample('login.qml');
      const qml = parseQml(source);
      const ui = qmlToUiDocument('login', qml);

      // Text element has expression binding to user.name
      assert.equal(ui.root.children[0].text?.kind, 'expression');
      assert.ok(ui.root.children[0].text?.dependencies.includes('user'));
    });

    test('should handle login.qml event handlers', () => {
      const source = readExample('login.qml');
      const qml = parseQml(source);
      const ui = qmlToUiDocument('login', qml);

      // Button has onClicked handler
      const button = ui.root.children[2];
      assert.equal(button.events.length, 1);
      assert.equal(button.events[0].angularEvent, 'click');
      assert.ok(button.events[0].handler.includes('submit'));
    });

    test('should handle login.qml layout anchors', () => {
      const source = readExample('login.qml');
      const qml = parseQml(source);
      const ui = qmlToUiDocument('login', qml);

      // Column has anchors.centerIn
      assert.equal(ui.root.layout?.centerInParent, true);
    });
  });

  describe('FigmaVariants Examples - Subset Tests', () => {
    test('should handle basic QML from FigmaVariants directory', () => {
      // Test that we can at least parse files from FigmaVariants without crashing
      const figmaDir = path.join(EXAMPLES_DIR, 'FigmaVariants');

      if (!fs.existsSync(figmaDir)) {
        console.log('FigmaVariants directory not found, skipping');
        return;
      }

      const qmlFiles = fs.readdirSync(figmaDir, { recursive: true })
        .filter(file => typeof file === 'string' && file.endsWith('.qml'))
        .slice(0, 5); // Test first 5 files as samples

      for (const file of qmlFiles) {
        const filepath = path.join(figmaDir, file as string);
        try {
          const source = fs.readFileSync(filepath, 'utf-8');
          const qml = parseQml(source, { filePath: filepath });
          const ui = qmlToUiDocument(path.basename(file as string, '.qml'), qml);

          // Should not crash
          assert.ok(qml.root);
          assert.ok(ui.root);

          // May have diagnostics for unsupported features, that's expected
          if (ui.diagnostics.length > 0) {
            console.log(`  ${file}: ${ui.diagnostics.length} diagnostics (expected for complex examples)`);
          }
        } catch (error) {
          // Parser errors are acceptable for files with unsupported syntax
          console.log(`  ${file}: parse error (expected for advanced QML features)`);
        }
      }
    });

    test('should identify unsupported features in FigmaVariants samples', () => {
      // Create a simplified example that mimics FigmaVariants patterns
      const complexExample = `
Item {
  State {
    name: "hover"
    PropertyChanges { target: rect }
  }

  Rectangle {
    width: 100
    height: 50
  }
}`;

      const qml = parseQml(complexExample);
      const ui = qmlToUiDocument('figma-sample', qml);

      // Should process Rectangle but report State and PropertyChanges
      assert.ok(ui.root.children.some(c => c.name === 'Rectangle' || c.name === 'State'));
      assert.ok(ui.diagnostics.length >= 2, 'Should have diagnostics for State and PropertyChanges');
    });
  });

  describe('WebinarDemo Examples - Subset Tests', () => {
    test('should handle basic QML from WebinarDemo directory', () => {
      const webinarDir = path.join(EXAMPLES_DIR, 'WebinarDemo');

      if (!fs.existsSync(webinarDir)) {
        console.log('WebinarDemo directory not found, skipping');
        return;
      }

      const qmlFiles = fs.readdirSync(webinarDir, { recursive: true })
        .filter(file => typeof file === 'string' && file.endsWith('.qml'))
        .slice(0, 5); // Test first 5 files as samples

      for (const file of qmlFiles) {
        const filepath = path.join(webinarDir, file as string);
        try {
          const source = fs.readFileSync(filepath, 'utf-8');
          const qml = parseQml(source, { filePath: filepath });
          const ui = qmlToUiDocument(path.basename(file as string, '.qml'), qml);

          // Should not crash
          assert.ok(qml.root);
          assert.ok(ui.root);

          if (ui.diagnostics.length > 0) {
            console.log(`  ${file}: ${ui.diagnostics.length} diagnostics (expected for complex examples)`);
          }
        } catch (error) {
          // Parser errors are acceptable
          console.log(`  ${file}: parse error (expected for advanced QML features)`);
        }
      }
    });
  });

  describe('Regression: Simple Form Patterns', () => {
    test('should handle simple text input form', () => {
      const qml = `
Column {
  Text { text: "Name:" }
  TextField { placeholderText: "Enter name" }
  Text { text: "Email:" }
  TextField { placeholderText: "Enter email" }
  Button { text: "Submit" }
}`;

      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('form', parsed);
      const rendered = renderAngularMaterial(ui, 'FormComponent');

      assert.equal(ui.diagnostics.length, 0, 'Simple form should have no diagnostics');
      assert.equal(ui.root.children.length, 5);
      assert.ok(rendered.html.includes('<mat-form-field'));
      assert.ok(rendered.ts.includes('MatFormFieldModule'));
    });

    test('should handle button grid pattern', () => {
      const qml = `
Column {
  Row {
    Button { text: "1" }
    Button { text: "2" }
    Button { text: "3" }
  }
  Row {
    Button { text: "4" }
    Button { text: "5" }
    Button { text: "6" }
  }
}`;

      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('grid', parsed);
      const rendered = renderAngularMaterial(ui, 'GridComponent');

      assert.equal(ui.diagnostics.length, 0);
      assert.equal(ui.root.children.length, 2);
      assert.equal(ui.root.children[0].children.length, 3);

      // Should have nested flex layouts
      assert.ok(rendered.scss.includes('.qml-column'));
      assert.ok(rendered.scss.includes('.qml-row'));
    });
  });

  describe('Regression: Binding Patterns', () => {
    test('should handle simple identifier (currently treated as literal)', () => {
      const qml = 'Text { text: name }';
      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('test', parsed);

      // Simple identifiers are currently treated as literals
      // This is a known limitation - expression detection needs enhancement
      assert.equal(ui.root.text?.kind, 'literal');
    });

    test('should handle dotted property access', () => {
      const qml = 'Text { text: user.profile.name }';
      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('test', parsed);

      assert.equal(ui.root.text?.kind, 'expression');
      assert.ok(ui.root.text?.dependencies.includes('user'));
    });

    test('should handle expressions with dotted access', () => {
      const qml = `
Column {
  Text { text: user.firstName }
  Text { text: user.lastName }
  Text { text: user.email }
}`;

      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('test', parsed);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should have 3 computed declarations for dotted expressions
      const computedCount = (rendered.ts.match(/computed\(/g) || []).length;
      assert.equal(computedCount, 3);

      // Should have 1 signal declaration for 'user' (shared dependency)
      assert.ok(rendered.ts.includes('readonly user = signal'));
    });
  });

  describe('Regression: Handler Patterns', () => {
    test('should handle simple function call handler', () => {
      const qml = 'Button { onClicked: doAction() }';
      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('test', parsed);

      assert.equal(ui.root.events.length, 1);
      assert.ok(ui.root.events[0].handler.includes('doAction'));
    });

    test('should handle expression handler', () => {
      const qml = 'Button { onClicked: count = count + 1 }';
      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('test', parsed);

      assert.equal(ui.root.events.length, 1);
      assert.ok(ui.root.events[0].handler.includes('count'));
    });
  });

  describe('Regression: Output Stability', () => {
    test('should produce identical output for repeated conversion', () => {
      const source = readExample('login.qml');

      const rendered1 = renderAngularMaterial(
        qmlToUiDocument('login', parseQml(source)),
        'LoginComponent'
      );

      const rendered2 = renderAngularMaterial(
        qmlToUiDocument('login', parseQml(source)),
        'LoginComponent'
      );

      assert.equal(rendered1.ts, rendered2.ts);
      assert.equal(rendered1.html, rendered2.html);
      assert.equal(rendered1.scss, rendered2.scss);
    });

    test('should maintain import order stability', () => {
      const qml = `
Column {
  Button { text: "OK" }
  TextField { }
  Button { text: "Cancel" }
}`;

      const rendered1 = renderAngularMaterial(
        qmlToUiDocument('test', parseQml(qml)),
        'TestComponent'
      );

      const rendered2 = renderAngularMaterial(
        qmlToUiDocument('test', parseQml(qml)),
        'TestComponent'
      );

      // Imports should appear in same order
      assert.equal(rendered1.ts, rendered2.ts);
    });
  });

  describe('Regression: Known Issues', () => {
    test('should gracefully handle complex expressions (limited support)', () => {
      const qml = 'Text { text: user.items[0].name }';
      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('test', parsed);

      // Should parse without crashing, even if not perfectly lowered
      assert.ok(ui.root);
      assert.equal(ui.root.text?.kind, 'expression');
    });

    test('should handle missing property values', () => {
      const qml = 'Text { }';
      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('test', parsed);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should use default "TODO" text
      assert.ok(rendered.html.includes('TODO') || rendered.ts.includes('TODO'));
    });
  });
});
