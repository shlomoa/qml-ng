import { layoutToScss } from '../converter/layout-resolver';
import { UiNode } from '../schema/ui-schema';
import { ScssRenderer } from './renderer-contract';

function collectLayoutScss(node: UiNode, level = 0): string[] {
  const rules: string[] = [];
  const selector = level === 0 ? ':host' : '';
  const css = layoutToScss(node.layout);
  if (selector && css) {
    rules.push(`${selector} {\n${css}\n}`);
  }
  node.children.forEach(child => rules.push(...collectLayoutScss(child, level + 1)));
  return rules;
}

export class AngularScssRenderer implements ScssRenderer {
  render(root: UiNode): string {
    return [
      ':host {',
      '  display: block;',
      '}',
      '',
      '.qml-column {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 16px;',
      '}',
      '',
      '.qml-row {',
      '  display: flex;',
      '  flex-direction: row;',
      '  gap: 16px;',
      '}',
      '',
      '.qml-column-layout {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 16px;',
      '}',
      '',
      '.qml-row-layout {',
      '  display: flex;',
      '  flex-direction: row;',
      '  gap: 16px;',
      '}',
      '',
      '.qml-window {',
      '  display: block;',
      '}',
      '',
      '.qml-structural {',
      '  display: contents;',
      '}',
      '',
      '.qml-group {',
      '  display: block;',
      '}',
      '',
      '.qml-scroll-view {',
      '  display: block;',
      '  overflow: auto;',
      '  max-width: 100%;',
      '  max-height: 100%;',
      '}',
      '',
      '.qml-shape-path {',
      '  display: contents;',
      '}',
      '',
      '.qml-stack-layout {',
      '  display: block;',
      '}',
      '',
      '.qml-grid-layout {',
      '  display: grid;',
      '  gap: 16px;',
      '}',
      '',
      '.qml-flexbox-layout {',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  gap: 16px;',
      '}',
      '',
      '.qml-image {',
      '  display: block;',
      '  max-width: 100%;',
      '}',
      '',
      '.qml-unsupported {',
      '  padding: 8px;',
      '  border: 1px dashed currentColor;',
      '}',
      '',
      ...collectLayoutScss(root)
    ].join('\n');
  }
}
