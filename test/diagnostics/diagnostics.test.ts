import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { parseQml } from '../../dist/lib/qml/parser.js';
import { qmlToUiDocument } from '../../dist/lib/converter/qml-to-ui.js';

describe('Diagnostics Tests', () => {
  describe('Unsupported QML Types', () => {
    test('should generate diagnostic for completely unsupported type', () => {
      const qml = parseQml('UnsupportedCustomType { }');
      const ui = qmlToUiDocument('test', qml);

      assert.ok(ui.diagnostics.length > 0, 'Should have diagnostics');
      assert.ok(
        ui.diagnostics.some(d => d.includes('Unsupported')),
        'Should mention unsupported type'
      );
      assert.ok(
        ui.diagnostics.some(d => d.includes('UnsupportedCustomType')),
        'Should mention the specific type'
      );
    });

    test('should mark unsupported node kind as unknown', () => {
      const qml = parseQml('CustomWidget { }');
      const ui = qmlToUiDocument('test', qml);

      assert.equal(ui.root.kind, 'unknown');
      assert.equal(ui.root.meta?.unsupported, true);
    });

    test('should continue processing children of unsupported types', () => {
      const qml = parseQml(`
CustomType {
  Text { text: "Still works" }
  Button { text: "Also works" }
}`);
      const ui = qmlToUiDocument('test', qml);

      assert.equal(ui.root.kind, 'unknown');
      assert.equal(ui.root.children.length, 2);
      assert.equal(ui.root.children[0].kind, 'text');
      assert.equal(ui.root.children[1].kind, 'button');
      assert.ok(ui.diagnostics.length > 0);
    });
  });

  describe('Graphics and Effects Types', () => {
    test('should report SvgPathItem as unsupported', () => {
      const qml = parseQml('SvgPathItem { }');
      const ui = qmlToUiDocument('test', qml);

      assert.ok(ui.diagnostics.length > 0);
      assert.ok(ui.diagnostics.some(d => d.includes('SvgPathItem')));
    });

    test('should report FastBlur as unsupported', () => {
      const qml = parseQml('FastBlur { }');
      const ui = qmlToUiDocument('test', qml);

      assert.ok(ui.diagnostics.length > 0);
    });

    test('should report ShaderEffect as unsupported', () => {
      const qml = parseQml('ShaderEffect { }');
      const ui = qmlToUiDocument('test', qml);

      assert.ok(ui.diagnostics.length > 0);
    });
  });

  describe('State and Animation Types', () => {
    test('should silently ignore KeyframeGroup (animation type)', () => {
      const qml = parseQml('KeyframeGroup { }');
      const ui = qmlToUiDocument('test', qml);

      assert.equal(ui.root.kind, 'animation');
      assert.equal(ui.root.meta?.ignored, true);
      // Animation types don't generate diagnostics, they're just ignored
    });

    test('should silently ignore PathLine', () => {
      const qml = parseQml('PathLine { }');
      const ui = qmlToUiDocument('test', qml);

      assert.equal(ui.root.kind, 'animation');
    });

    test('should report State as unsupported', () => {
      const qml = parseQml('State { }');
      const ui = qmlToUiDocument('test', qml);

      assert.ok(ui.diagnostics.length > 0);
    });

    test('should report PropertyChanges as unsupported', () => {
      const qml = parseQml('PropertyChanges { }');
      const ui = qmlToUiDocument('test', qml);

      assert.ok(ui.diagnostics.length > 0);
    });
  });

  describe('Multiple Diagnostics', () => {
    test('should collect multiple diagnostics from nested structure', () => {
      const qml = parseQml(`
Column {
  UnsupportedTypeA { }
  Text { text: "OK" }
  UnsupportedTypeB { }
}`);
      const ui = qmlToUiDocument('test', qml);

      assert.ok(ui.diagnostics.length >= 2, 'Should have at least 2 diagnostics');
      assert.ok(ui.diagnostics.some(d => d.includes('UnsupportedTypeA')));
      assert.ok(ui.diagnostics.some(d => d.includes('UnsupportedTypeB')));
    });

    test('should collect diagnostics from deeply nested structures', () => {
      const qml = parseQml(`
Column {
  Row {
    UnknownA { }
  }
  Row {
    UnknownB { }
  }
}`);
      const ui = qmlToUiDocument('test', qml);

      assert.ok(ui.diagnostics.length >= 2);
    });
  });

  describe('Supported vs Unsupported Boundary', () => {
    test('should NOT generate diagnostics for supported containers', () => {
      const supportedTypes = ['Column', 'Row', 'Item', 'Rectangle', 'Window'];

      for (const type of supportedTypes) {
        const qml = parseQml(`${type} { }`);
        const ui = qmlToUiDocument('test', qml);
        assert.equal(
          ui.diagnostics.length,
          0,
          `${type} should not generate diagnostics`
        );
      }
    });

    test('should NOT generate diagnostics for supported controls', () => {
      const supportedTypes = ['Text', 'Button', 'TextField', 'Image'];

      for (const type of supportedTypes) {
        const qml = parseQml(`${type} { }`);
        const ui = qmlToUiDocument('test', qml);
        assert.equal(
          ui.diagnostics.length,
          0,
          `${type} should not generate diagnostics`
        );
      }
    });

    test('should NOT generate diagnostics for supported layout types', () => {
      const supportedTypes = ['ColumnLayout', 'RowLayout', 'StackLayout', 'GridLayout', 'FlexboxLayout'];

      for (const type of supportedTypes) {
        const qml = parseQml(`${type} { }`);
        const ui = qmlToUiDocument('test', qml);
        assert.equal(
          ui.diagnostics.length,
          0,
          `${type} should not generate diagnostics`
        );
      }
    });

    test('should NOT generate diagnostics for structural types', () => {
      const structuralTypes = ['QtObject', 'Component'];

      for (const type of structuralTypes) {
        const qml = parseQml(`${type} { }`);
        const ui = qmlToUiDocument('test', qml);
        assert.equal(
          ui.diagnostics.length,
          0,
          `${type} should not generate diagnostics`
        );
      }
    });
  });

  describe('Diagnostic Context', () => {
    test('should provide specific type name in diagnostic', () => {
      const qml = parseQml('VerySpecificCustomType { }');
      const ui = qmlToUiDocument('test', qml);

      assert.ok(
        ui.diagnostics.some(d => d.includes('VerySpecificCustomType')),
        'Diagnostic should include the specific type name'
      );
    });

    test('should have clear diagnostic message format', () => {
      const qml = parseQml('UnknownType { }');
      const ui = qmlToUiDocument('test', qml);

      assert.ok(ui.diagnostics.length > 0);
      const diagnostic = ui.diagnostics[0];

      // Diagnostic should be a clear, readable message
      assert.ok(diagnostic.includes('Unsupported'));
      assert.ok(diagnostic.includes('UnknownType'));
    });
  });

  describe('Real-World Unsupported Examples', () => {
    test('should handle example with mix of supported and unsupported types', () => {
      const qml = parseQml(`
Column {
  Text { text: "Supported" }
  FastBlur { radius: 32 }
  Button { text: "Also Supported" }
  SvgPathItem { strokeColor: "red" }
}`);
      const ui = qmlToUiDocument('test', qml);

      // Should have supported children
      assert.ok(ui.root.children.some(c => c.kind === 'text'));
      assert.ok(ui.root.children.some(c => c.kind === 'button'));

      // Should have diagnostics for unsupported types
      assert.ok(ui.diagnostics.length >= 2);
    });

    test('should handle FigmaVariants-style complex structures gracefully', () => {
      // Simulating structure found in FigmaVariants with unsupported features
      const qml = parseQml(`
Item {
  State {
    name: "hover"
    PropertyChanges {
      target: button
      color: "blue"
    }
  }

  Button {
    text: "Hover Me"
  }
}`);
      const ui = qmlToUiDocument('test', qml);

      // Should still process the Button
      assert.ok(ui.root.children.some(c => c.kind === 'button'));

      // Should have diagnostics for State and PropertyChanges
      assert.ok(ui.diagnostics.length >= 2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty document with unsupported root', () => {
      const qml = parseQml('UnknownType { }');
      const ui = qmlToUiDocument('test', qml);

      assert.equal(ui.root.kind, 'unknown');
      assert.ok(ui.diagnostics.length > 0);
    });

    test('should not duplicate diagnostics for same type', () => {
      const qml = parseQml(`
Column {
  UnknownType { }
}`);
      const ui1 = qmlToUiDocument('test', qml);

      // Each instance should get a diagnostic
      assert.equal(ui1.diagnostics.length, 1);
    });
  });

  describe('Diagnostic Accumulation', () => {
    test('should accumulate all diagnostics in document', () => {
      const qml = parseQml(`
Unknown1 {
  Unknown2 {
    Unknown3 { }
  }
}`);
      const ui = qmlToUiDocument('test', qml);

      // Should have 3 diagnostics, one for each unknown type
      assert.equal(ui.diagnostics.length, 3);
    });
  });
});
