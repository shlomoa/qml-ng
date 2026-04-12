import test from 'node:test';

import { assertSnapshot, compileGeneratedComponent, renderQml } from './helpers.mjs';

test('login smoke sample matches TS/HTML/SCSS snapshots and compiles', async () => {
  const { rendered } = await renderQml({
    filePath: 'examples/login.qml',
    componentName: 'login-form',
    className: 'LoginFormComponent'
  });

  assertSnapshot('login-form.component.ts', rendered.ts);
  assertSnapshot('login-form.component.html', rendered.html);
  assertSnapshot('login-form.component.scss', rendered.scss);
  compileGeneratedComponent('login-form', rendered);
});

test('real stack layout example renders stable golden output', async () => {
  const { rendered } = await renderQml({
    filePath: 'examples/WebinarDemo/WebinarDemoContent/Stacklayoutframe.ui.qml',
    componentName: 'stacklayout-frame',
    className: 'StacklayoutFrameComponent'
  });

  assertSnapshot('golden/stacklayout-frame.component.html', rendered.html);
  assertSnapshot('golden/stacklayout-frame.component.scss', rendered.scss);
  compileGeneratedComponent('stacklayout-frame', rendered);
});

test('state-driven large button example keeps stable unsupported-output snapshots', async () => {
  const { document, rendered } = await renderQml({
    filePath: 'examples/FigmaVariants/FigmaVariantsContent/LargeButton.ui.qml',
    componentName: 'large-button',
    className: 'LargeButtonComponent'
  });

  assertSnapshot('golden/large-button.component.html', rendered.html);
  assertSnapshot(
    'golden/large-button.diagnostics.txt',
    document.diagnostics.map(diagnostic => `${diagnostic.severity}:${diagnostic.code ?? 'NO_CODE'}:${diagnostic.message}`).join('\n')
  );
});
