import { UiButtonNode, UiContainerNode, UiDocument, UiInputNode, UiNode, UiTextNode, UiUnsupportedNode } from '../schema/ui-schema';

export interface RenderedAngularArtifacts {
  html: string;
  scss: string;
  imports: string[];
}

export function renderAngularMaterial(document: UiDocument): RenderedAngularArtifacts {
  const imports = new Set<string>();
  const html = renderNode(document.root, imports, 0);
  const scss = [
    ':host { display: block; }',
    '.qml-column { display: flex; flex-direction: column; }',
    '.qml-row { display: flex; flex-direction: row; align-items: center; }',
    '.qml-stack { position: relative; }',
    '.qml-unsupported { border: 1px dashed currentColor; padding: 0.75rem; }'
  ].join('\n');

  return {
    html,
    scss,
    imports: Array.from(imports).sort()
  };
}

function renderNode(node: UiNode, imports: Set<string>, indent: number): string {
  switch (node.kind) {
    case 'container':
      return renderContainer(node, imports, indent);
    case 'text':
      return renderText(node, indent);
    case 'input':
      return renderInput(node, imports, indent);
    case 'button':
      return renderButton(node, imports, indent);
    case 'unsupported':
      return renderUnsupported(node, indent);
    default:
      return `${spaces(indent)}<!-- Unknown node -->`;
  }
}

function renderContainer(node: UiContainerNode, imports: Set<string>, indent: number): string {
  const className = `qml-${node.layout}`;
  const style = node.spacing !== undefined ? ` style="gap: ${node.spacing}px;"` : '';
  const children = node.children.map((child) => renderNode(child, imports, indent + 2)).join('\n');
  return `${spaces(indent)}<div class="${className}"${style}>\n${children}\n${spaces(indent)}</div>`;
}

function renderText(node: UiTextNode, indent: number): string {
  const tag = node.role === 'title' ? 'h1' : 'span';
  return `${spaces(indent)}<${tag}>${escapeHtml(node.text)}</${tag}>`;
}

function renderInput(node: UiInputNode, imports: Set<string>, indent: number): string {
  imports.add('MatFormFieldModule');
  imports.add('MatInputModule');
  const label = node.label ? `${spaces(indent + 2)}<mat-label>${escapeHtml(node.label)}</mat-label>\n` : '';
  const placeholder = node.placeholder ? ` placeholder="${escapeAttribute(node.placeholder)}"` : '';
  return `${spaces(indent)}<mat-form-field appearance="outline">\n${label}${spaces(indent + 2)}<input matInput type="${node.inputType}"${placeholder} />\n${spaces(indent)}</mat-form-field>`;
}

function renderButton(node: UiButtonNode, imports: Set<string>, indent: number): string {
  imports.add('MatButtonModule');
  const attr = node.variant === 'flat' ? 'mat-flat-button' : node.variant === 'stroked' ? 'mat-stroked-button' : 'mat-raised-button';
  return `${spaces(indent)}<button ${attr}>${escapeHtml(node.text)}</button>`;
}

function renderUnsupported(node: UiUnsupportedNode, indent: number): string {
  return `${spaces(indent)}<div class="qml-unsupported">TODO: Unsupported QML node ${escapeHtml(node.qmlType)} — ${escapeHtml(node.reason)}</div>`;
}

function spaces(count: number): string {
  return ' '.repeat(count);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;');
}
