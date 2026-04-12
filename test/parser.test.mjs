import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { loadBuiltModules, readRepoFile, repoRoot } from './helpers.mjs';

test('parser captures typed and alias properties in the AST', async () => {
  const { parseQmlWithDiagnostics } = await loadBuiltModules();
  const result = parseQmlWithDiagnostics(`Item {
  property int count: 0
  property alias labelText: label.text
  readonly property bool ready: true

  Text {
    id: label
    text: "Ready"
  }
}`);

  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.document.root.typeName, 'Item');
  assert.deepStrictEqual(
    result.document.root.properties.map(property => ({
      name: property.name,
      propertyKind: property.propertyKind,
      typeName: property.typeName
    })),
    [
      { name: 'count', propertyKind: 'typed', typeName: 'int' },
      { name: 'labelText', propertyKind: 'alias', typeName: undefined },
      { name: 'ready', propertyKind: 'readonly', typeName: 'bool' }
    ]
  );
});

test('parser resolves real example composite controls from WebinarDemo', async () => {
  const { parseQml } = await loadBuiltModules();
  const filePath = path.join(repoRoot, 'examples', 'WebinarDemo', 'WebinarDemoContent', 'App.qml');
  const document = parseQml(readRepoFile('examples/WebinarDemo/WebinarDemoContent/App.qml'), {
    filePath,
    searchRoots: [path.join(repoRoot, 'examples', 'WebinarDemo')]
  });

  const mainApp = document.root.children.find(child => child.typeName === 'MainApp');
  assert.ok(mainApp, 'expected MainApp child in real example');
  assert.equal(
    mainApp.resolvedSourcePath,
    path.join(repoRoot, 'examples', 'WebinarDemo', 'WebinarDemoContent', 'MainApp.ui.qml')
  );
});
