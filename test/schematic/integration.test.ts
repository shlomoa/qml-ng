import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import * as path from 'node:path';
import { parseQml } from '../../dist/lib/qml/parser.js';
import { qmlToUiDocument } from '../../dist/lib/converter/qml-to-ui.js';
import { renderAngularMaterial } from '../../dist/lib/angular/material-renderer.js';

/**
 * Schematic Integration Tests
 *
 * These tests verify the full pipeline from QML to Angular Material output,
 * simulating what the schematic does but without requiring a full Angular workspace.
 *
 * For true schematic integration tests against a real Angular workspace,
 * see the Angular Schematics testing documentation:
 * https://angular.dev/tools/cli/schematics-authoring
 */

describe('Schematic Integration (Pipeline)', () => {
  describe('End-to-End Pipeline', () => {
    test('should convert QML through full pipeline', () => {
      const qml = `
Column {
  Text { text: "Hello" }
  Button { text: "Click" }
}`;

      // Step 1: Parse QML
      const parsed = parseQml(qml);
      assert.equal(parsed.root.typeName, 'Column');

      // Step 2: Convert to UI Schema
      const ui = qmlToUiDocument('test-component', parsed);
      assert.equal(ui.name, 'test-component');
      assert.equal(ui.root.kind, 'container');

      // Step 3: Render Angular Material
      const rendered = renderAngularMaterial(ui, 'TestComponent');
      assert.ok(rendered.ts);
      assert.ok(rendered.html);
      assert.ok(rendered.scss);

      // Verify outputs are non-empty and valid
      assert.ok(rendered.ts.length > 0);
      assert.ok(rendered.html.length > 0);
      assert.ok(rendered.scss.length > 0);
    });

    test('should maintain component naming conventions', () => {
      const qml = 'Text { text: "Test" }';
      const ui = qmlToUiDocument('my-feature', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'MyFeatureComponent');

      // Verify naming conventions
      assert.ok(rendered.ts.includes('export class MyFeatureComponent'));
      assert.ok(rendered.ts.includes("selector: 'app-my-feature'"));
      assert.ok(rendered.ts.includes("templateUrl: './my-feature.component.html'"));
      assert.ok(rendered.ts.includes("styleUrl: './my-feature.component.scss'"));
    });

    test('should generate standalone component structure', () => {
      const qml = 'Button { text: "Click" }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Verify standalone component structure
      assert.ok(rendered.ts.includes('standalone: true'));
      assert.ok(rendered.ts.includes('imports: ['));
      assert.ok(rendered.ts.includes('@Component({'));
    });

    test('should generate required Angular imports', () => {
      const qml = 'Text { text: user.name }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should import from @angular/core
      assert.ok(rendered.ts.includes("from '@angular/core'"));
      assert.ok(rendered.ts.includes('Component'));
      assert.ok(rendered.ts.includes('computed'));
      assert.ok(rendered.ts.includes('signal'));
    });

    test('should generate Material imports when needed', () => {
      const qml = `
Column {
  Button { text: "OK" }
  TextField { }
}`;
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should import Material modules
      assert.ok(rendered.ts.includes("from '@angular/material/button'"));
      assert.ok(rendered.ts.includes("from '@angular/material/form-field'"));
      assert.ok(rendered.ts.includes("from '@angular/material/input'"));
    });
  });

  describe('Component File Generation', () => {
    test('should generate TypeScript file with proper structure', () => {
      const qml = 'Text { text: "Hello" }';
      const ui = qmlToUiDocument('greeting', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'GreetingComponent');

      // Verify TypeScript structure
      const lines = rendered.ts.split('\n');
      assert.ok(lines.some(l => l.includes('import')), 'Should have imports');
      assert.ok(lines.some(l => l.includes('@Component')), 'Should have decorator');
      assert.ok(lines.some(l => l.includes('export class')), 'Should export class');
    });

    test('should generate HTML template with valid Angular syntax', () => {
      const qml = 'Button { text: "Click" onClicked: action() }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Verify HTML validity
      assert.ok(rendered.html.includes('<button'));
      assert.ok(rendered.html.includes('</button>'));
      assert.ok(rendered.html.includes('(click)'));
    });

    test('should generate SCSS file with valid CSS', () => {
      const qml = 'Column { Text { text: "A" } Text { text: "B" } }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Verify SCSS structure
      assert.ok(rendered.scss.includes(':host'));
      assert.ok(rendered.scss.includes('.qml-column'));
      assert.ok(rendered.scss.includes('{'));
      assert.ok(rendered.scss.includes('}'));
    });
  });

  describe('Complex Component Generation', () => {
    test('should handle form with multiple controls', () => {
      const qml = `
Column {
  Text { text: "Login Form" }
  TextField { placeholderText: "Username" }
  TextField { placeholderText: "Password" }
  Button { text: "Submit" onClicked: login() }
}`;

      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('login-form', parsed);
      const rendered = renderAngularMaterial(ui, 'LoginFormComponent');

      // Should generate complete component
      assert.ok(rendered.ts.includes('LoginFormComponent'));
      assert.ok(rendered.html.includes('qml-column'));
      assert.ok(rendered.html.includes('mat-form-field'));
      assert.ok(rendered.html.includes('mat-raised-button'));

      // Should have proper imports
      assert.ok(rendered.ts.includes('MatButtonModule'));
      assert.ok(rendered.ts.includes('MatFormFieldModule'));
      assert.ok(rendered.ts.includes('MatInputModule'));
    });

    test('should handle nested layouts', () => {
      const qml = `
Row {
  Column {
    Text { text: "A" }
    Text { text: "B" }
  }
  Column {
    Button { text: "C" }
    Button { text: "D" }
  }
}`;

      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('nested', parsed);
      const rendered = renderAngularMaterial(ui, 'NestedComponent');

      // Should handle nested structure
      assert.ok(rendered.html.includes('qml-row'));
      assert.ok(rendered.html.includes('qml-column'));

      // Should have layout styles
      assert.ok(rendered.scss.includes('.qml-row'));
      assert.ok(rendered.scss.includes('.qml-column'));
    });
  });

  describe('Component Class Generation', () => {
    test('should generate signals for expression dependencies', () => {
      const qml = 'Text { text: user.name }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should generate signal
      assert.ok(rendered.ts.includes('readonly user = signal<any>'));
    });

    test('should generate computed properties for expressions', () => {
      const qml = 'Text { text: firstName + " " + lastName }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should generate computed
      assert.ok(rendered.ts.includes('computed('));
    });

    test('should not generate signals when not needed', () => {
      const qml = 'Text { text: "Static Text" }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should not have signal imports or declarations
      assert.ok(!rendered.ts.includes('signal<any>'));
    });
  });

  describe('Template Generation', () => {
    test('should generate Material button template', () => {
      const qml = 'Button { text: "Click Me" }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.html.includes('<button mat-raised-button'));
      assert.ok(rendered.html.includes('</button>'));
    });

    test('should generate Material form field template', () => {
      const qml = 'TextField { placeholderText: "Enter text" }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.html.includes('<mat-form-field'));
      assert.ok(rendered.html.includes('<input matInput'));
      assert.ok(rendered.html.includes('[placeholder]'));
    });

    test('should generate event bindings', () => {
      const qml = 'Button { text: "Click" onClicked: handleClick() }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.html.includes('(click)'));
      assert.ok(rendered.html.includes('handleClick()'));
    });

    test('should generate interpolation for text', () => {
      const qml = 'Text { text: "Hello" }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.html.includes('{{'));
      assert.ok(rendered.html.includes('}}'));
    });
  });

  describe('Style Generation', () => {
    test('should generate host styles', () => {
      const qml = 'Text { text: "Hello" }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.scss.includes(':host'));
      assert.ok(rendered.scss.includes('display: block'));
    });

    test('should generate layout styles', () => {
      const qml = 'Column { Text { text: "A" } }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      assert.ok(rendered.scss.includes('.qml-column'));
      assert.ok(rendered.scss.includes('display: flex'));
      assert.ok(rendered.scss.includes('flex-direction: column'));
    });

    test('should generate anchor styles when applicable', () => {
      const qml = 'Column { anchors.centerIn: parent Text { text: "A" } }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should have layout-related CSS
      assert.ok(rendered.scss.includes(':host'));
    });
  });

  describe('Pipeline Error Handling', () => {
    test('should handle conversion of unsupported types', () => {
      const qml = 'UnsupportedType { }';
      const parsed = parseQml(qml);
      const ui = qmlToUiDocument('test', parsed);
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should generate output despite unsupported type
      assert.ok(rendered.ts);
      assert.ok(rendered.html);
      assert.ok(rendered.scss);

      // Should have diagnostic
      assert.ok(ui.diagnostics.length > 0);
    });

    test('should render unsupported nodes with placeholder', () => {
      const qml = 'UnknownControl { }';
      const ui = qmlToUiDocument('test', parseQml(qml));
      const rendered = renderAngularMaterial(ui, 'TestComponent');

      // Should include unsupported marker
      assert.ok(rendered.html.includes('qml-unsupported') || rendered.html.includes('Unsupported'));
    });
  });
});
