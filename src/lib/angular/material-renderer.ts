import { lowerBinding } from '../converter/expression-lowering';
import { layoutToScss } from '../converter/layout-resolver';
import { UiBinding, UiDocument, UiNode, UiStateDeclaration } from '../schema/ui-schema';
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
  /** Names of signals already declared via typed property declarations */
  declaredSignalNames: Set<string>;
  exprCounter: number;
}

function bindingLiteralOrExpr(binding: UiBinding | undefined, fieldPrefix: string, ctx: RenderContext): string {
  if (!binding) return "''";

  if (binding.kind === 'literal') {
    return JSON.stringify(binding.value ?? '');
  }

  // Re-lower the expression through the full AST path here rather than relying on
  // `binding.dependencies` because the initial binding may have been built before
  // the AST-based pipeline was unified — regex-based extraction (used in
  // BindingLoweringPass.ensureProperBinding) does not respect string quote contexts
  // and would incorrectly include string literal content (e.g. "Reset", "Start")
  // as signal dependencies.  Re-lowering is cheap and guarantees correct deps.
  const lowered = lowerBinding(binding.expression ?? '');
  lowered.binding.dependencies.forEach(d => ctx.dependencyNames.add(d));
  const fieldName = `${fieldPrefix}Expr${++ctx.exprCounter}`;
  ctx.computedDeclarations.push(`readonly ${fieldName} = computed(() => ${lowered.angularExpression});`);
  return `${fieldName}()`;
}

function renderEvents(node: UiNode): string {
  if (!node.events.length) return '';
  return ' ' + node.events.map(e => `(${e.angularEvent})="${e.handler}"`).join(' ');
}

function renderBoundAttribute(name: string, expression: string): string {
  const escapedExpression = expression
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;');
  return `[${name}]='${escapedExpression}'`;
}

function containerClassName(node: UiNode): string {
  if (node.meta?.role === 'window') return 'qml-window';
  if (node.meta?.role === 'structural') return 'qml-structural';
  if (node.meta?.role === 'group') return 'qml-group';
  if (node.meta?.role === 'scroll-view') return 'qml-scroll-view';
  if (node.meta?.role === 'shape-path') return 'qml-shape-path';
  if (node.meta?.layoutKind === 'stack') return 'qml-stack-layout';
  if (node.meta?.layoutKind === 'grid') return 'qml-grid-layout';
  if (node.meta?.layoutKind === 'flexbox') return 'qml-flexbox-layout';
  if (node.meta?.layoutKind === 'row-layout') return 'qml-row-layout';
  if (node.meta?.layoutKind === 'column-layout') return 'qml-column-layout';
  if (node.meta?.orientation === 'row') return 'qml-row';
  return 'qml-column';
}

function renderNode(node: UiNode, ctx: RenderContext): string {
  switch (node.kind) {
    case 'container': {
      const className = containerClassName(node);
      const content = node.children.map(child => renderNode(child, ctx)).filter(Boolean).join('\n');
      return `<div class="${className}"${renderEvents(node)}>${content ? `\n${content}\n` : ''}</div>`;
    }

    case 'text': {
      const textExpr = bindingLiteralOrExpr(node.text, 'text', ctx);
      return `<span${renderEvents(node)}>{{ ${textExpr} }}</span>`;
    }

    case 'input': {
      const placeholderExpr = bindingLiteralOrExpr(node.placeholder, 'placeholder', ctx);
      return [
        `<mat-form-field appearance="outline"${renderEvents(node)}>`,
        `  <input matInput ${renderBoundAttribute('placeholder', placeholderExpr)}>`,
        `</mat-form-field>`
      ].join('\n');
    }

    case 'image': {
      const sourceExpr = bindingLiteralOrExpr(node.source, 'imageSource', ctx);
      return `<img class="qml-image"${renderEvents(node)} ${renderBoundAttribute('src', sourceExpr)}>`;
    }

    case 'button': {
      const textExpr = bindingLiteralOrExpr(node.text, 'buttonText', ctx);
      return `<button mat-raised-button${renderEvents(node)}>{{ ${textExpr} }}</button>`;
    }

    case 'animation':
      return '';

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

/**
 * Recursively collect all UiStateDeclaration objects from a node tree.
 * Declarations are de-duplicated by name (first occurrence wins).
 */
function collectStateDeclarations(node: UiNode): UiStateDeclaration[] {
  const seen = new Set<string>();
  const result: UiStateDeclaration[] = [];

  function visit(n: UiNode): void {
    for (const decl of n.stateDeclarations ?? []) {
      if (!seen.has(decl.name)) {
        seen.add(decl.name);
        result.push(decl);
      }
    }
    n.children.forEach(visit);
  }

  visit(node);
  return result;
}

/**
 * Emit an Angular signal declaration line for a typed property.
 *
 * `property int count: 0`          → `readonly count = signal<number>(0);`
 * `readonly property string label` → `readonly label = signal<string>('');`
 */
function stateDeclarationToTs(decl: UiStateDeclaration): string {
  return `readonly ${decl.name} = signal<${decl.tsType}>(${decl.initialValue});`;
}

export function renderAngularMaterial(doc: UiDocument, className: string): RenderedAngularComponent {
  // Collect typed property declarations from the whole tree first so the
  // renderer knows which signal names are already declared.
  const typedDeclarations = collectStateDeclarations(doc.root);
  const declaredSignalNames = new Set(typedDeclarations.map(d => d.name));

  const ctx: RenderContext = {
    computedDeclarations: [],
    signalDeclarations: [],
    dependencyNames: new Set<string>(),
    declaredSignalNames,
    exprCounter: 0
  };

  const html = renderNode(doc.root, ctx);
  const materialImports = collectMaterialImports(doc.root);

  // Typed property declarations → `signal<T>(initialValue)`
  const typedSignalLines = typedDeclarations
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(stateDeclarationToTs);

  // Expression dependencies NOT already declared via typed properties
  // → fallback `signal<any>(null)` so templates compile
  const undeclaredDeps = [...ctx.dependencyNames]
    .filter(dep => !declaredSignalNames.has(dep))
    .sort();
  for (const dep of undeclaredDeps) {
    ctx.signalDeclarations.push(`readonly ${dep} = signal<any>(null);`);
  }

  const needsSignal = typedSignalLines.length > 0 || ctx.signalDeclarations.length > 0;
  const needsComputed = ctx.computedDeclarations.length > 0;
  const ngImports = [
    'Component',
    ...(needsComputed ? ['computed'] : []),
    ...(needsSignal ? ['signal'] : [])
  ];

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
    ...typedSignalLines.map(s => `  ${s}`),
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
    ...collectLayoutScss(doc.root)
  ].join('\n');

  return { ts, html, scss };
}
