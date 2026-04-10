import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { parseQml } from '../../dist/lib/qml/parser.js';

describe('Parser', () => {
  describe('Basic Object Parsing', () => {
    test('should parse empty object', () => {
      const doc = parseQml('Item { }');
      assert.equal(doc.root.typeName, 'Item');
      assert.equal(doc.root.properties.length, 0);
      assert.equal(doc.root.children.length, 0);
    });

    test('should parse object with properties', () => {
      const doc = parseQml('Text { text: "Hello" }');
      assert.equal(doc.root.typeName, 'Text');
      assert.equal(doc.root.properties.length, 1);
      assert.equal(doc.root.properties[0].name, 'text');
      assert.equal(doc.root.properties[0].value.kind, 'string');
      assert.equal(doc.root.properties[0].value.value, 'Hello');
    });

    test('should parse nested objects', () => {
      const doc = parseQml('Column { Text { } Button { } }');
      assert.equal(doc.root.typeName, 'Column');
      assert.equal(doc.root.children.length, 2);
      assert.equal(doc.root.children[0].typeName, 'Text');
      assert.equal(doc.root.children[1].typeName, 'Button');
    });

    test('should parse deeply nested objects', () => {
      const doc = parseQml('Column { Row { Text { } } }');
      assert.equal(doc.root.typeName, 'Column');
      assert.equal(doc.root.children.length, 1);
      assert.equal(doc.root.children[0].typeName, 'Row');
      assert.equal(doc.root.children[0].children.length, 1);
      assert.equal(doc.root.children[0].children[0].typeName, 'Text');
    });
  });

  describe('Property Parsing', () => {
    test('should parse string property', () => {
      const doc = parseQml('Text { text: "Hello World" }');
      const prop = doc.root.properties[0];
      assert.equal(prop.name, 'text');
      assert.equal(prop.value.kind, 'string');
      assert.equal(prop.value.value, 'Hello World');
    });

    test('should parse number property', () => {
      const doc = parseQml('Item { width: 100 }');
      const prop = doc.root.properties[0];
      assert.equal(prop.name, 'width');
      assert.equal(prop.value.kind, 'number');
      assert.equal(prop.value.value, 100);
    });

    test('should parse identifier property', () => {
      const doc = parseQml('Item { state: active }');
      const prop = doc.root.properties[0];
      assert.equal(prop.name, 'state');
      assert.equal(prop.value.kind, 'identifier');
      assert.equal(prop.value.value, 'active');
    });

    test('should parse expression property', () => {
      const doc = parseQml('Text { text: user.name }');
      const prop = doc.root.properties[0];
      assert.equal(prop.name, 'text');
      assert.equal(prop.value.kind, 'expression');
      assert.equal(prop.value.value, 'user.name');
    });

    test('should parse dotted property names', () => {
      const doc = parseQml('Item { anchors.fill: parent }');
      const prop = doc.root.properties[0];
      assert.equal(prop.name, 'anchors.fill');
      assert.equal(prop.value.kind, 'identifier');
      assert.equal(prop.value.value, 'parent');
    });

    test('should parse multiple properties', () => {
      const doc = parseQml('Button { text: "Click" enabled: true }');
      assert.equal(doc.root.properties.length, 2);
      assert.equal(doc.root.properties[0].name, 'text');
      assert.equal(doc.root.properties[1].name, 'enabled');
    });
  });

  describe('Typed Properties', () => {
    test('should parse property declarations', () => {
      const doc = parseQml('Item { property string name: "test" }');
      assert.equal(doc.root.properties.length, 1);
      assert.equal(doc.root.properties[0].name, 'name');
      assert.equal(doc.root.properties[0].value.kind, 'string');
    });

    test('should parse readonly property', () => {
      const doc = parseQml('Item { readonly property int count: 5 }');
      assert.equal(doc.root.properties.length, 1);
      assert.equal(doc.root.properties[0].name, 'count');
    });

    test('should parse property alias', () => {
      const doc = parseQml('Item { property alias myText: text.content }');
      assert.equal(doc.root.properties.length, 1);
      assert.equal(doc.root.properties[0].name, 'myText');
    });
  });

  describe('Embedded Objects', () => {
    test('should parse embedded object in property', () => {
      const doc = parseQml('Item { font: Font { size: 12 } }');
      const prop = doc.root.properties[0];
      assert.equal(prop.name, 'font');
      assert.ok(prop.embeddedObject);
      assert.equal(prop.embeddedObject.typeName, 'Font');
      assert.equal(prop.embeddedObject.properties.length, 1);
    });
  });

  describe('Component Declarations', () => {
    test('should parse component declarations', () => {
      const doc = parseQml('Item { component MyButton: Button { } }');
      assert.equal(doc.root.children.length, 1);
      assert.equal(doc.root.children[0].typeName, 'Button');
    });
  });

  describe('Import and Pragma Handling', () => {
    test('should skip import statements', () => {
      const doc = parseQml('import QtQuick 2.15\nItem { }');
      assert.equal(doc.root.typeName, 'Item');
    });

    test('should skip pragma statements', () => {
      const doc = parseQml('pragma Singleton\nItem { }');
      assert.equal(doc.root.typeName, 'Item');
    });

    test('should handle multiple imports', () => {
      const doc = parseQml('import QtQuick 2.15\nimport QtQuick.Controls 2.15\nItem { }');
      assert.equal(doc.root.typeName, 'Item');
    });
  });

  describe('Function and Signal Declarations', () => {
    test('should skip function declarations', () => {
      const doc = parseQml('Item { function test() { return 1; } }');
      assert.equal(doc.root.properties.length, 0);
      assert.equal(doc.root.children.length, 0);
    });

    test('should skip signal declarations', () => {
      const doc = parseQml('Item { signal clicked() }');
      assert.equal(doc.root.properties.length, 0);
    });
  });

  describe('Complex Expressions', () => {
    test('should parse expression with operators', () => {
      const doc = parseQml('Item { width: parent.width * 0.5 }');
      const prop = doc.root.properties[0];
      assert.equal(prop.value.kind, 'expression');
      assert.ok(prop.value.value.includes('*'));
    });

    test('should parse expression with function calls', () => {
      const doc = parseQml('Text { text: getName() }');
      const prop = doc.root.properties[0];
      assert.equal(prop.value.kind, 'expression');
      assert.ok(prop.value.value.includes('()'));
    });

    test('should parse expression with arrays', () => {
      const doc = parseQml('Item { data: [1, 2, 3] }');
      const prop = doc.root.properties[0];
      assert.equal(prop.value.kind, 'expression');
      assert.ok(prop.value.value.includes('['));
    });
  });

  describe('Real QML Examples', () => {
    test('should parse login.qml structure', () => {
      const qml = `
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
}`;
      const doc = parseQml(qml);
      assert.equal(doc.root.typeName, 'Column');
      assert.equal(doc.root.children.length, 3);
      assert.equal(doc.root.children[0].typeName, 'Text');
      assert.equal(doc.root.children[1].typeName, 'TextField');
      assert.equal(doc.root.children[2].typeName, 'Button');
    });

    test('should parse complex layout', () => {
      const qml = `
Row {
  Column {
    Text { text: "Title" }
    Text { text: "Subtitle" }
  }
  Column {
    Button { text: "OK" }
    Button { text: "Cancel" }
  }
}`;
      const doc = parseQml(qml);
      assert.equal(doc.root.typeName, 'Row');
      assert.equal(doc.root.children.length, 2);
      assert.equal(doc.root.children[0].children.length, 2);
      assert.equal(doc.root.children[1].children.length, 2);
    });
  });

  describe('Error Handling', () => {
    test('should throw on unexpected token', () => {
      assert.throws(() => {
        parseQml('Item }');
      });
    });

    test('should throw on missing brace', () => {
      assert.throws(() => {
        parseQml('Item {');
      });
    });
  });

  describe('Whitespace and Formatting', () => {
    test('should handle multiline formatting', () => {
      const qml = `
Item {
  text: "hello"
  width: 100
}`;
      const doc = parseQml(qml);
      assert.equal(doc.root.properties.length, 2);
    });

    test('should handle compact formatting', () => {
      const doc = parseQml('Item{text:"hello"width:100}');
      assert.equal(doc.root.properties.length, 2);
    });
  });
});
