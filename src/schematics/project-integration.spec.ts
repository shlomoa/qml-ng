import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';
import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';

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

function writeTempBundle(): { rootDir: string; qmlProject: string; cleanup: () => void } {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qml-ng-bundle-'));
  const bundleDir = path.join(rootDir, 'bundle');
  const assetDir = path.join(bundleDir, 'assets');

  fs.mkdirSync(assetDir, { recursive: true });
  fs.writeFileSync(
    path.join(bundleDir, 'App.qml'),
    `Window {
  Column {
    Image { source: "assets/logo.png" }
    Child { }
  }
}`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(bundleDir, 'Child.ui.qml'),
    `Item {
  Text { text: "Child" }
}`,
    'utf8'
  );
  fs.writeFileSync(path.join(assetDir, 'logo.png'), 'fake-png-data', 'utf8');

  const qmlProject = path.join(rootDir, 'Demo.qmlproject');
  fs.writeFileSync(
    qmlProject,
    `import QmlProject

Project {
    mainFile: "bundle/App.qml"
    mainUiFile: "bundle/Child.ui.qml"
}`,
    'utf8'
  );

  return {
    rootDir,
    qmlProject,
    cleanup: () => {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  };
}

function createGeneratedComponent(tree: Tree, feature: string, relativeDirectory: string[], name: string): void {
  const basePath = ['/projects/demo-app/src/app', feature, ...relativeDirectory, name].join('/');
  tree.create(`/${basePath}/${name}.component.ts`, `export class ${name}Component {}`);
  tree.create(`/${basePath}/${name}.component.html`, `<p>${name}</p>`);
  tree.create(`/${basePath}/${name}.component.scss`, `.${name} {}`);
}

test('qml-feature schematic generates reachable bundle components, copies assets, and updates workspace files', async () => {
  const runner = new SchematicTestRunner('qml-ng', collectionPath);
  const tree = createWorkspaceTree();
  const { qmlProject, cleanup } = writeTempBundle();

  try {
    const result = await runner.runSchematic('qml-feature', {
      qmlProject,
      project: 'demo-app',
      feature: 'showcase',
      updateBarrel: true,
      routeMode: 'feature'
    }, tree);

    assert.ok(result.exists('/projects/demo-app/src/app/showcase/bundle/app/app.component.ts'));
    assert.ok(result.exists('/projects/demo-app/src/app/showcase/bundle/child/child.component.ts'));
    assert.equal(
      result.readText('/projects/demo-app/src/assets/showcase/bundle/assets/logo.png'),
      'fake-png-data'
    );
    assert.match(
      result.readText('/projects/demo-app/src/app/showcase/bundle/app/app.component.html'),
      /assets\/showcase\/bundle\/assets\/logo\.png/
    );
    assert.match(
      result.readText('/projects/demo-app/src/app/showcase/index.ts'),
      /export \* from '\.\/bundle\/app\/app\.component';/
    );
    assert.match(
      result.readText('/projects/demo-app/src/app/showcase/feature.routes.ts'),
      /path: 'bundle\/app'/
    );
  } finally {
    cleanup();
  }
});

test('update-routes schematic rebuilds route entries from generated component files', async () => {
  const runner = new SchematicTestRunner('qml-ng', collectionPath);
  const tree = createWorkspaceTree();

  createGeneratedComponent(tree, 'account', [], 'login-form');
  createGeneratedComponent(tree, 'account', ['dialogs'], 'profile-card');

  const result = await runner.runSchematic('update-routes', {
    project: 'demo-app',
    feature: 'account',
    routeMode: 'feature'
  }, tree);

  assert.match(
    result.readText('/projects/demo-app/src/app/account/feature.routes.ts'),
    /path: 'login-form'/
  );
  assert.match(
    result.readText('/projects/demo-app/src/app/account/feature.routes.ts'),
    /path: 'dialogs\/profile-card'/
  );
});

test('migrate-generated and validate-generated schematics keep project integration files consistent', async () => {
  const runner = new SchematicTestRunner('qml-ng', collectionPath);
  const tree = createWorkspaceTree();
  const { qmlProject, cleanup } = writeTempBundle();

  try {
    const generated = await runner.runSchematic('qml-feature', {
      qmlProject,
      project: 'demo-app',
      feature: 'showcase'
    }, tree);
    const migrated = await runner.runSchematic('migrate-generated', {
      project: 'demo-app',
      feature: 'showcase',
      updateBarrel: true,
      routeMode: 'feature'
    }, generated);

    assert.match(
      migrated.readText('/projects/demo-app/src/app/showcase/index.ts'),
      /export \* from '\.\/bundle\/child\/child\.component';/
    );

    const validated = await runner.runSchematic('validate-generated', {
      qmlProject,
      project: 'demo-app',
      feature: 'showcase',
      updateBarrel: true,
      routeMode: 'feature'
    }, migrated);

    assert.ok(validated.exists('/projects/demo-app/src/app/showcase/feature.routes.ts'));
  } finally {
    cleanup();
  }
});
