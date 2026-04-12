import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import {
  planComponentOutput,
  qmlRelativeDirectory,
  resolveWorkspaceDestinationLayout
} from './workspace-generation';

const collectionPath = path.resolve(__dirname, '../../collection.json');

function createWorkspaceTree(): Tree {
  const tree = Tree.empty();

  tree.create('/angular.json', JSON.stringify({
    version: 1,
    defaultProject: 'demo-app',
    projects: {
      'demo-app': {
        root: 'projects/demo-app',
        sourceRoot: 'projects/demo-app/src'
      }
    }
  }, null, 2));

  return tree;
}

function writeTempQmlFile(source: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'qml-ng-'));
  const filePath = path.join(directory, 'LoginForm.qml');
  fs.writeFileSync(filePath, source, 'utf8');
  return filePath;
}

test('resolveWorkspaceDestinationLayout plans workspace-aware component, shell, and asset destinations', () => {
  const layout = resolveWorkspaceDestinationLayout(createWorkspaceTree(), {
    project: 'demo-app',
    feature: 'account/settings',
    updateBarrel: true,
    routeMode: 'feature'
  });
  const plan = planComponentOutput(layout, 'login-form', ['dialogs']);

  assert.equal(plan.componentDirectory, '/projects/demo-app/src/app/account/settings/dialogs/login-form');
  assert.equal(plan.shellRoot, '/projects/demo-app/src/app/account/settings');
  assert.equal(plan.assetRoot, '/projects/demo-app/src/assets/account/settings');
  assert.equal(plan.barrelPath, '/projects/demo-app/src/app/account/settings/index.ts');
  assert.equal(plan.routeFilePath, '/projects/demo-app/src/app/account/settings/feature.routes.ts');
  assert.equal(plan.routeDeclaration, `{ path: 'dialogs/login-form', loadComponent: () => import('./dialogs/login-form/login-form.component').then(m => m.LoginFormComponent) }`);
});

test('qmlRelativeDirectory preserves nested bundle structure as relative segments', () => {
  assert.deepEqual(
    qmlRelativeDirectory('/tmp/input-bundle', '/tmp/input-bundle/panels/shared/Header.ui.qml'),
    ['panels', 'shared']
  );
});

test('qml-component schematic writes into the workspace project and updates barrel and routes', async () => {
  const runner = new SchematicTestRunner('qml-ng', collectionPath);
  const tree = createWorkspaceTree();
  const qmlFile = writeTempQmlFile('Column { Text { text: "Hello" } }');
  const qmlDirectory = path.dirname(qmlFile);

  tree.create(
    '/projects/demo-app/src/app/app.routes.ts',
    `import { Routes } from '@angular/router';\n\nexport const routes: Routes = [\n];\n`
  );

  try {
    const result = await runner.runSchematic('qml-component', {
      name: 'login-form',
      qmlFile,
      project: 'demo-app',
      feature: 'account',
      updateBarrel: true,
      routeMode: 'project'
    }, tree);

    assert.ok(result.exists('/projects/demo-app/src/app/account/login-form/login-form.component.ts'));
    assert.ok(result.exists('/projects/demo-app/src/app/account/login-form/login-form.component.html'));
    assert.ok(result.exists('/projects/demo-app/src/app/account/login-form/login-form.component.scss'));
    assert.match(
      result.readText('/projects/demo-app/src/app/account/index.ts'),
      /export \* from '\.\/login-form\/login-form\.component';/
    );
    assert.match(
      result.readText('/projects/demo-app/src/app/app.routes.ts'),
      /path: 'login-form', loadComponent: \(\) => import\('\.\/account\/login-form\/login-form\.component'\)/
    );
  } finally {
    fs.rmSync(qmlDirectory, { recursive: true, force: true });
  }
});
