import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { parseQml } from '../../dist/lib/qml/parser.js';
import { qmlToUiDocument } from '../../dist/lib/converter/qml-to-ui.js';

describe('Semantic Lowering (QML to UI Schema)', () => {
  describe('Basic Type Mapping', () => {
    test('should map Text to text node', () => {
      const qml = parseQml('Text { text: "Hello" }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'text');
      assert.equal(ui.root.name, 'Text');
    });

    test('should map Button to button node', () => {
      const qml = parseQml('Button { text: "Click" }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'button');
      assert.equal(ui.root.name, 'Button');
    });

    test('should map TextField to input node', () => {
      const qml = parseQml('TextField { placeholderText: "Email" }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'input');
      assert.equal(ui.root.name, 'TextField');
    });

    test('should map Image to image node', () => {
      const qml = parseQml('Image { source: "logo.png" }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'image');
      assert.equal(ui.root.name, 'Image');
    });
  });

  describe('Layout Container Mapping', () => {
    test('should map Column to container with column meta', () => {
      const qml = parseQml('Column { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.name, 'Column');
      assert.equal(ui.root.meta?.orientation, 'column');
    });

    test('should map Row to container with row meta', () => {
      const qml = parseQml('Row { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.name, 'Row');
      assert.equal(ui.root.meta?.orientation, 'row');
    });

    test('should map ColumnLayout', () => {
      const qml = parseQml('ColumnLayout { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.meta?.layoutKind, 'column-layout');
    });

    test('should map RowLayout', () => {
      const qml = parseQml('RowLayout { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.meta?.layoutKind, 'row-layout');
    });

    test('should map StackLayout', () => {
      const qml = parseQml('StackLayout { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.meta?.layoutKind, 'stack');
    });

    test('should map GridLayout', () => {
      const qml = parseQml('GridLayout { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.meta?.layoutKind, 'grid');
    });
  });

  describe('Shell Type Mapping', () => {
    test('should map Window to container with window role', () => {
      const qml = parseQml('Window { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.meta?.role, 'window');
    });

    test('should map Item to container with group role', () => {
      const qml = parseQml('Item { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.meta?.role, 'group');
    });

    test('should map Rectangle to container', () => {
      const qml = parseQml('Rectangle { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.meta?.role, 'group');
    });
  });

  describe('Property Lowering', () => {
    test('should lower string literal binding', () => {
      const qml = parseQml('Text { text: "Hello" }');
      const ui = qmlToUiDocument('test', qml);
      assert.ok(ui.root.text);
      assert.equal(ui.root.text.kind, 'literal');
      assert.equal(ui.root.text.value, 'Hello');
    });

    test('should lower expression binding', () => {
      const qml = parseQml('Text { text: user.name }');
      const ui = qmlToUiDocument('test', qml);
      assert.ok(ui.root.text);
      assert.equal(ui.root.text.kind, 'expression');
      assert.ok(ui.root.text.expression);
      assert.ok(ui.root.text.dependencies.length > 0);
    });

    test('should lower placeholder in TextField', () => {
      const qml = parseQml('TextField { placeholderText: "Email" }');
      const ui = qmlToUiDocument('test', qml);
      assert.ok(ui.root.placeholder);
      assert.equal(ui.root.placeholder.kind, 'literal');
      assert.equal(ui.root.placeholder.value, 'Email');
    });

    test('should lower source in Image', () => {
      const qml = parseQml('Image { source: "logo.png" }');
      const ui = qmlToUiDocument('test', qml);
      assert.ok(ui.root.source);
      assert.equal(ui.root.source.kind, 'literal');
      assert.equal(ui.root.source.value, 'logo.png');
    });
  });

  describe('Event Handling', () => {
    test('should map onClicked handler', () => {
      const qml = parseQml('Button { onClicked: submit() }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.events.length, 1);
      assert.equal(ui.root.events[0].name, 'onClicked');
      assert.equal(ui.root.events[0].angularEvent, 'click');
      assert.ok(ui.root.events[0].handler.includes('submit'));
    });

    test('should map onTextChanged handler', () => {
      const qml = parseQml('TextField { onTextChanged: validate() }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.events.length, 1);
      assert.equal(ui.root.events[0].name, 'onTextChanged');
    });
  });

  describe('Layout Resolution', () => {
    test('should resolve anchors.fill', () => {
      const qml = parseQml('Item { anchors.fill: parent }');
      const ui = qmlToUiDocument('test', qml);
      assert.ok(ui.root.layout);
      assert.equal(ui.root.layout.fillParent, true);
    });

    test('should resolve anchors.centerIn', () => {
      const qml = parseQml('Item { anchors.centerIn: parent }');
      const ui = qmlToUiDocument('test', qml);
      assert.ok(ui.root.layout);
      assert.equal(ui.root.layout.centerInParent, true);
    });
  });

  describe('Children Handling', () => {
    test('should convert nested children', () => {
      const qml = parseQml('Column { Text { } Button { } }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.children.length, 2);
      assert.equal(ui.root.children[0].kind, 'text');
      assert.equal(ui.root.children[1].kind, 'button');
    });

    test('should handle embedded objects as children', () => {
      const qml = parseQml('Item { contentItem: Text { } }');
      const ui = qmlToUiDocument('test', qml);
      // Embedded objects should be included in children
      assert.ok(ui.root.children.length >= 1);
    });
  });

  describe('Diagnostics', () => {
    test('should generate diagnostic for unsupported type', () => {
      const qml = parseQml('UnsupportedType { }');
      const ui = qmlToUiDocument('test', qml);
      assert.ok(ui.diagnostics.length > 0);
      assert.ok(ui.diagnostics[0].includes('Unsupported'));
    });

    test('should map unknown types to unknown node kind', () => {
      const qml = parseQml('CustomControl { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'unknown');
      assert.equal(ui.root.meta?.unsupported, true);
    });
  });

  describe('Animation Types', () => {
    test('should mark animation types as animation kind', () => {
      const qml = parseQml('KeyframeGroup { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'animation');
      assert.equal(ui.root.meta?.ignored, true);
    });

    test('should mark path types as animation kind', () => {
      const qml = parseQml('PathLine { }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'animation');
    });
  });

  describe('Real Example Conversion', () => {
    test('should convert login.qml structure', () => {
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
      const ui = qmlToUiDocument('login', qml);

      assert.equal(ui.name, 'login');
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.name, 'Column');
      assert.equal(ui.root.layout?.centerInParent, true);
      assert.equal(ui.root.children.length, 3);

      const textNode = ui.root.children[0];
      assert.equal(textNode.kind, 'text');
      assert.equal(textNode.text?.kind, 'expression');

      const textFieldNode = ui.root.children[1];
      assert.equal(textFieldNode.kind, 'input');
      assert.equal(textFieldNode.placeholder?.kind, 'literal');

      const buttonNode = ui.root.children[2];
      assert.equal(buttonNode.kind, 'button');
      assert.equal(buttonNode.events.length, 1);
      assert.equal(buttonNode.events[0].angularEvent, 'click');
    });

    test('should preserve structural types', () => {
      const qml = parseQml('QtObject { Component { Item { } } }');
      const ui = qmlToUiDocument('test', qml);
      assert.equal(ui.root.kind, 'container');
      assert.equal(ui.root.meta?.role, 'structural');
    });
  });

  describe('Complex Nested Structures', () => {
    test('should handle deeply nested components', () => {
      const qml = parseQml(`
Row {
  Column {
    Text { text: "A" }
    Button { text: "B" }
  }
  Column {
    TextField { }
    Image { source: "img.png" }
  }
}`);
      const ui = qmlToUiDocument('complex', qml);

      assert.equal(ui.root.children.length, 2);
      assert.equal(ui.root.children[0].children.length, 2);
      assert.equal(ui.root.children[1].children.length, 2);
    });
  });
});
