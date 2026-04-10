import { lowerBinding } from '../converter/expression-lowering';
import { layoutToScss } from '../converter/layout-resolver';
import { UiBinding, UiDocument, UiNode } from '../schema/ui-schema';
import { collectMaterialImports } from './material-imports';

export interface RenderedAngularComponent {
  ts: string;
  html: string;
  scss: string;
}

interface RenderContext {
  computedDeclarations: string[];
  signalDeclarations: string[];
  dependencyNames: Set<string>;
  exprCounter: number;
}

function bindingLiteralOrExpr(binding: UiBinding | undefined, fieldPrefix: string, ctx: RenderContext): string {
  if (!binding) return "''";

  if (binding.kind === 'literal') {
    return JSON.stringify(binding.value ?? '');
  }

  binding.dependencies.forEach(d => ctx.dependencyNames.add(d));
  const lowered = lowerBinding(binding.expression ?? '');
  const fieldName = `${fieldPrefix}Expr${++ctx.exprCounter}`;
  ctx.computedDeclarations.push(`readonly ${fieldName} = computed(() => ${lowered.angularExpression});`);
  return `${fieldName}()`;
}

function renderEvents(node: UiNode): string {
  if (!node.events.length) return '';
  return ' ' + node.events.map(e => `(${e.angularEvent})="${e.handler}"`).join(' ');
}

function renderNode(node: UiNode, ctx: RenderContext): string {
  switch (node.kind) {
    case 'container': {
      const orientation = node.meta?.orientation === 'row' ? 'qml-row' : 'qml-column';
      const content = node.children.map(child => renderNode(child, ctx)).join('\n');
      return `<div class="${orientation}"${renderEvents(node)}>\n${content}\n</div>`;
    }

    case 'text': {
      const textExpr = bindingLiteralOrExpr(node.text, 'text', ctx);
      return `<span${renderEvents(node)}>{{ ${textExpr} }}</span>`;
    }

    case 'input': {
      const placeholderExpr = bindingLiteralOrExpr(node.placeholder, 'placeholder', ctx);
      return [
        `<mat-form-field appearance="outline"${renderEvents(node)}>`,
        `  <input matInput [placeholder]="${placeholderExpr}">`,
        `</mat-form-field>`
      ].join('\n');
    }

    case 'button': {
      const textExpr = bindingLiteralOrExpr(node.text, 'buttonText', ctx);
      return `<button mat-raised-button${renderEvents(node)}>{{ ${textExpr} }}</button>`;
    }

    case 'unknown':
    default:
      return `<div class="qml-unsupported">Unsupported node: ${node.name ?? 'unknown'}</div>`;
  }
}

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

export function renderAngularMaterial(doc: UiDocument, className: string): RenderedAngularComponent {
  const ctx: RenderContext = {
    computedDeclarations: [],
    signalDeclarations: [],
    dependencyNames: new Set<string>(),
    exprCounter: 0
  };

  const html = renderNode(doc.root, ctx);
  const materialImports = collectMaterialImports(doc.root);
  const ngImports = [
    'Component',
    'computed',
    ...(ctx.dependencyNames.size ? ['signal'] : [])
  ];

  for (const dep of [...ctx.dependencyNames].sort()) {
    ctx.signalDeclarations.push(`readonly ${dep} = signal<any>(null);`);
  }

  const angularMaterialImportMap: Record<string, string> = {
    MatButtonModule: '@angular/material/button',
    MatFormFieldModule: '@angular/material/form-field',
    MatInputModule: '@angular/material/input'
  };

  const groupedMaterialImports = materialImports
    .map(name => `import { ${name} } from '${angularMaterialImportMap[name]}';`)
    .join('\n');

  const ts = [
    `import { ${ngImports.join(', ')} } from '@angular/core';`,
    groupedMaterialImports,
    '',
    '@Component({',
    `  selector: 'app-${doc.name}',`,
    '  standalone: true,',
    `  imports: [${materialImports.join(', ')}],`,
    `  templateUrl: './${doc.name}.component.html',`,
    `  styleUrl: './${doc.name}.component.scss'`,
    '})',
    `export class ${className} {`,
    ...ctx.signalDeclarations.map(s => `  ${s}`),
    ...ctx.computedDeclarations.map(s => `  ${s}`),
    '}',
    ''
  ].join('\n');

  const scss = [
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
    '.qml-unsupported {',
    '  padding: 8px;',
    '  border: 1px dashed currentColor;',
    '}',
    '',
    ...collectLayoutScss(doc.root)
  ].join('\n');

  return { ts, html, scss };
}
