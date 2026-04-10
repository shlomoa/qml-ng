import { ScssRenderer, RenderContext } from './renderer-contract';
import { UiNode } from '../schema/ui-schema';
import { layoutToScss } from '../converter/layout-resolver';

/**
 * Default implementation of SCSS renderer
 * Generates component styles including layout classes and node-specific rules
 */
export class DefaultScssRenderer implements ScssRenderer {
  render(root: UiNode, ctx: RenderContext): string {
    const lines: string[] = [];

    // Host styles
    lines.push(':host {');
    lines.push('  display: block;');
    lines.push('}');
    lines.push('');

    // Layout container classes
    lines.push(...this.renderLayoutClasses());

    // Node-specific layout rules
    lines.push(...this.collectLayoutScss(root));

    return lines.join('\n');
  }

  private renderLayoutClasses(): string[] {
    return [
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
      ''
    ];
  }

  private collectLayoutScss(node: UiNode, level = 0): string[] {
    const rules: string[] = [];
    const selector = level === 0 ? ':host' : '';
    const css = layoutToScss(node.layout);

    if (selector && css) {
      rules.push(`${selector} {`);
      rules.push(css);
      rules.push('}');
    }

    node.children.forEach(child => rules.push(...this.collectLayoutScss(child, level + 1)));
    return rules;
  }
}
