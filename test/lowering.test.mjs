import assert from 'node:assert/strict';
import test from 'node:test';

import { loadBuiltModules, renderQml } from './helpers.mjs';

test('semantic lowering extracts state declarations and event models', async () => {
  const { qmlToUiDocument, parseQml } = await loadBuiltModules();
  const document = qmlToUiDocument('counter-card', parseQml(`Item {
  property int count: 0
  property string label: "Ready"

  Button {
    text: label
    onClicked: count = count + 1
  }
}`));

  assert.deepStrictEqual(
    (document.root.stateDeclarations ?? []).map(({ name, tsType, initialValue }) => ({ name, tsType, initialValue })),
    [
      { name: 'count', tsType: 'number', initialValue: '0' },
      { name: 'label', tsType: 'string', initialValue: '"Ready"' }
    ]
  );

  const button = document.root.children[0];
  assert.equal(button.kind, 'button');
  assert.equal(button.events[0].behavior, 'method');
  assert.equal(button.events[0].handlerModel?.kind, 'assignment');
  assert.match(button.events[0].generatedMethod?.name ?? '', /^handleClick\d+$/);
  assert.ok(document.diagnostics.some(diagnostic => diagnostic.code === 'HANDLER_METHOD_STUB'));
});

test('diagnostics cover unsupported real-example states and graphics conservatively', async () => {
  const { document, rendered } = await renderQml({
    filePath: 'examples/FigmaVariants/FigmaVariantsContent/LargeButton.ui.qml',
    componentName: 'large-button',
    className: 'LargeButtonComponent'
  });

  assert.ok(document.diagnostics.some(diagnostic => diagnostic.code === 'UNSUPPORTED_TYPE'));
  assert.ok(document.diagnostics.some(diagnostic => diagnostic.message.includes('SvgPathItem')));
  assert.match(rendered.html, /qml-unsupported/);
});
