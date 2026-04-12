import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestLogger, loadBuiltModules, repoRoot } from './helpers.mjs';

test('qml-component schematic generates files inside a sample Angular workspace tree', async () => {
  const { qmlComponentSchematic } = await loadBuiltModules();
  const { Tree } = await import('@angular-devkit/schematics');
  const { logger, messages } = createTestLogger();
  const tree = Tree.empty();
  tree.create('/angular.json', '{}');
  tree.create('/package.json', '{"name":"workspace"}');
  tree.create('/projects/demo/src/main.ts', 'export {};');

  const rule = qmlComponentSchematic({
    name: 'login-form',
    qmlFile: `${repoRoot}/examples/login.qml`,
    path: 'projects/demo/src/app/login-form'
  });

  const resultTree = rule(tree, { logger });
  assert.ok(resultTree.exists('/projects/demo/src/app/login-form/login-form.component.ts'));
  assert.ok(resultTree.exists('/projects/demo/src/app/login-form/login-form.component.html'));
  assert.ok(resultTree.exists('/projects/demo/src/app/login-form/login-form.component.scss'));
  assert.equal(messages.filter(message => message.level === 'error').length, 0);
});

test('qml-batch schematic can generate a curated real-example slice into a workspace tree', async () => {
  const { qmlBatchSchematic } = await loadBuiltModules();
  const { Tree } = await import('@angular-devkit/schematics');
  const { logger, messages } = createTestLogger();
  const tree = Tree.empty();

  const rule = qmlBatchSchematic({
    qmlDir: `${repoRoot}/examples/WebinarDemo/WebinarDemoContent`,
    path: 'projects/demo/src/app/generated',
    recursive: false
  });

  const resultTree = rule(tree, { logger });
  assert.ok(resultTree.exists('/projects/demo/src/app/generated/main-app/main-app.component.ts'));
  assert.ok(resultTree.exists('/projects/demo/src/app/generated/stacklayoutframe/stacklayoutframe.component.html'));
  assert.equal(messages.filter(message => message.level === 'error').length, 0);
});
