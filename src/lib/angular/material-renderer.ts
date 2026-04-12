import { lowerBinding } from '../converter/expression-lowering';
import { extractDependencies } from '../qml/expression-analysis';
import { ExpressionNode } from '../qml/expression-ast';
import { ExpressionParser } from '../qml/expression-parser';
import { layoutToScss } from '../converter/layout-resolver';
import { UiBinding, UiDocument, UiEvent, UiNode, UiStateDeclaration } from '../schema/ui-schema';
import { collectMaterialImports } from './material-imports';

export interface RenderedAngularComponent {
  ts: string;
  html: string;
  scss: string;
}

interface RenderContext {
  computedDeclarations: string[];
  generatedMethods: string[];
  signalDeclarations: string[];
  dependencyNames: Set<string>;
  /** Names of signals already declared via typed property declarations */
  declaredSignalNames: Set<string>;
  emittedMethodNames: Set<string>;
  exprCounter: number;
}

const ALLOWED_HANDLER_CALLEE_PREFIXES = ['Math.'];
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SYNTACTIC_TS_EXPRESSION_PATTERN = /^[A-Za-z0-9_$.\s()[\]?:"',+\-*/%!=<>|&\\]+$/;

function safeGeneratedTsExpression(expression: string): string {
  const trimmed = expression.trim();
  return trimmed && SYNTACTIC_TS_EXPRESSION_PATTERN.test(trimmed) ? trimmed : 'undefined';
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
  // Re-parse for class-field generation because lowerBinding only returns the final
  // template-style expression string and dependency list. That template-style form
  // cannot be reused directly in the component class because class fields need
  // `this.user().name` while templates use `user().name`, so we need the AST again
  // to emit class-context signal reads safely.
  let classExpression = 'undefined';
  if (binding.expression) {
    const parser = new ExpressionParser();
    const result = parser.parse(binding.expression);
    if (result.ast && result.errors.length === 0) {
      classExpression = safeGeneratedTsExpression(
        generateComponentExpression(result.ast, new Set(lowered.binding.dependencies))
      );
    }
  }
  const fieldName = `${fieldPrefix}Expr${++ctx.exprCounter}`;
  ctx.computedDeclarations.push(`readonly ${fieldName} = computed(() => ${classExpression});`);
  return `${fieldName}()`;
}

function escapeTemplateEventExpression(expression: string): string {
  return expression
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeWhitespaceForComment(handler: string): string {
  return handler.replace(/\s+/g, ' ').trim();
}

function isAllowedHandlerCallee(callee: string): boolean {
  return ALLOWED_HANDLER_CALLEE_PREFIXES.some(prefix => callee.startsWith(prefix));
}

function generateComponentExpression(ast: ExpressionNode, signalNames: Set<string>): string {
  switch (ast.kind) {
    case 'literal':
      return JSON.stringify(ast.value);

    case 'identifier':
      return signalNames.has(ast.name) ? `this.${ast.name}()` : ast.name;

    case 'memberAccess':
      return `${generateComponentExpression(ast.object, signalNames)}${ast.optional ? '?.' : '.'}${ast.property}`;

    case 'call':
      return `${generateComponentExpression(ast.callee, signalNames)}(${ast.arguments
        .map(argument => generateComponentExpression(argument, signalNames))
        .join(', ')})`;

    case 'unaryOp':
      return `${ast.operator}${generateComponentExpression(ast.argument, signalNames)}`;

    case 'binaryOp':
      return `${generateComponentExpression(ast.left, signalNames)} ${ast.operator} ${generateComponentExpression(ast.right, signalNames)}`;

    case 'conditional':
      return `${generateComponentExpression(ast.test, signalNames)} ? ${generateComponentExpression(ast.consequent, signalNames)} : ${generateComponentExpression(ast.alternate, signalNames)}`;

    case 'array':
      return `[${ast.elements.map(element => generateComponentExpression(element, signalNames)).join(', ')}]`;
  }
}

function renderAssignmentMethod(event: UiEvent, ctx: RenderContext): string {
  const model = event.handlerModel;
  if (model?.kind !== 'assignment' || !event.generatedMethod) {
    return '';
  }

  const targetIsSignal = IDENTIFIER_PATTERN.test(model.target) && ctx.declaredSignalNames.has(model.target);
  if (targetIsSignal) {
    const parser = new ExpressionParser();
    const result = parser.parse(model.value);
    if (result.ast && result.errors.length === 0) {
      const dependencyInfo = extractDependencies(result.ast);
      const hasUnverifiedIdentifiers = [...dependencyInfo.identifiers].some(identifier => !ctx.declaredSignalNames.has(identifier));
      const usesUnsupportedCallee = [...dependencyInfo.callees].some(callee => !isAllowedHandlerCallee(callee));
      if (!hasUnverifiedIdentifiers && !usesUnsupportedCallee) {
        const valueExpression = safeGeneratedTsExpression(
          generateComponentExpression(result.ast, ctx.declaredSignalNames)
        );
        return [
          `  ${event.generatedMethod.name}(): void {`,
          `    this.${model.target}.set(${valueExpression});`,
          '  }'
        ].join('\n');
      }
    }
  }

  return [
    `  ${event.generatedMethod.name}(): void {`,
    `    // TODO(qml-ng): Translate QML handler: ${normalizeWhitespaceForComment(event.handler)}`,
    '  }'
  ].join('\n');
}

function ensureGeneratedMethod(event: UiEvent, ctx: RenderContext): void {
  if (!event.generatedMethod || ctx.emittedMethodNames.has(event.generatedMethod.name)) {
    return;
  }

  const methodSource = renderAssignmentMethod(event, ctx);
  if (!methodSource) {
    return;
  }

  ctx.emittedMethodNames.add(event.generatedMethod.name);
  ctx.generatedMethods.push(methodSource);
}

function renderEvents(node: UiNode, ctx: RenderContext): string {
  if (!node.events.length) return '';
  const renderedEvents = node.events.flatMap(event => {
    if (event.behavior === 'unsupported') {
      return [];
    }

    if (event.behavior === 'method' && event.generatedMethod) {
      ensureGeneratedMethod(event, ctx);
      return [`(${event.angularEvent})="${escapeTemplateEventExpression(`${event.generatedMethod.name}()`)}"`];
    }

    if (event.behavior === 'inline' && event.handlerModel?.kind === 'call') {
      return [`(${event.angularEvent})="${escapeTemplateEventExpression(event.handlerModel.expression)}"`];
    }

    return [];
  });

  return renderedEvents.length > 0 ? ` ${renderedEvents.join(' ')}` : '';
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
      return `<div class="${className}"${renderEvents(node, ctx)}>${content ? `\n${content}\n` : ''}</div>`;
    }

    case 'text': {
      const textExpr = bindingLiteralOrExpr(node.text, 'text', ctx);
      return `<span${renderEvents(node, ctx)}>{{ ${textExpr} }}</span>`;
    }

    case 'input': {
      const placeholderExpr = bindingLiteralOrExpr(node.placeholder, 'placeholder', ctx);
      return [
        `<mat-form-field appearance="outline"${renderEvents(node, ctx)}>`,
        `  <input matInput ${renderBoundAttribute('placeholder', placeholderExpr)}>`,
        `</mat-form-field>`
      ].join('\n');
    }

    case 'image': {
      const sourceExpr = bindingLiteralOrExpr(node.source, 'imageSource', ctx);
      return `<img class="qml-image"${renderEvents(node, ctx)} ${renderBoundAttribute('src', sourceExpr)}>`;
    }

    case 'button': {
      const textExpr = bindingLiteralOrExpr(node.text, 'buttonText', ctx);
      return `<button mat-raised-button${renderEvents(node, ctx)}>{{ ${textExpr} }}</button>`;
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
    generatedMethods: [],
    signalDeclarations: [],
    dependencyNames: new Set<string>(),
    declaredSignalNames,
    emittedMethodNames: new Set<string>(),
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
    ...ctx.generatedMethods,
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
