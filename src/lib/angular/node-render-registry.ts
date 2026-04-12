import { lowerBinding } from '../converter/expression-lowering';
import { UiBinding, UiNode } from '../schema/ui-schema';
import { DiagnosticsEmitter, RenderContext } from './renderer-contract';

const ANGULAR_EXPRESSION_ALLOWLIST_PATTERN = /^[\w\s.$()[\]?:"',+\-*/%<>=!&|]+$/;
const UNSAFE_EXPRESSION_COMMENT =
  '/* TODO(qml-ng): Unsupported binding expression contains characters outside the Angular expression allowlist (for example backticks, semicolons, or braces) and needs manual review. */';

export type UiNodeMappingCategory = 'supported' | 'approximated' | 'unsupported';
export type UiNodeRendererKind = 'angular' | 'material' | 'placeholder' | 'none';

type NodeStringListRule = readonly string[] | ((node: UiNode) => readonly string[]);
type NodeStringRule = string | ((node: UiNode) => string);
type NodeCategoryRule = UiNodeMappingCategory | ((node: UiNode) => UiNodeMappingCategory);

type NodeTemplateRenderer = (node: UiNode, context: RenderContext, diagnosticsEmitter: DiagnosticsEmitter) => string;

interface UiNodeRenderRuleDefinition {
  templateRenderer: NodeTemplateRenderer;
  templateDescription: NodeStringRule;
  angularImports?: NodeStringListRule;
  materialImports?: NodeStringListRule;
  themeHooks?: NodeStringListRule;
  accessibilityRules?: NodeStringListRule;
  mappingCategory: NodeCategoryRule;
  rendererKind: UiNodeRendererKind;
}

export interface UiNodeRenderRule {
  templateRenderer: NodeTemplateRenderer;
  templateDescription: string;
  angularImports: string[];
  materialImports: string[];
  themeHooks: string[];
  accessibilityRules: string[];
  mappingCategory: UiNodeMappingCategory;
  rendererKind: UiNodeRendererKind;
}

function sanitizeAngularComputedExpression(expression: string): { expression: string; comment?: string } {
  if (ANGULAR_EXPRESSION_ALLOWLIST_PATTERN.test(expression)) {
    return { expression };
  }

  return {
    expression: 'undefined',
    comment: UNSAFE_EXPRESSION_COMMENT
  };
}

function bindingLiteralOrExpr(binding: UiBinding | undefined, fieldPrefix: string, context: RenderContext): string {
  if (!binding) return "''";

  if (binding.kind === 'literal') {
    return JSON.stringify(binding.value ?? '');
  }

  const lowered = lowerBinding(binding.expression ?? '');
  lowered.binding.dependencies.forEach(dependency => context.dependencyNames.add(dependency));
  const fieldName = `${fieldPrefix}Expr${++context.computedExpressionCounter}`;
  const sanitized = sanitizeAngularComputedExpression(lowered.angularExpression);
  const computedExpression = sanitized.comment
    ? `${sanitized.expression} ${sanitized.comment}`
    : sanitized.expression;
  context.computedDeclarations.push(`readonly ${fieldName} = computed(() => ${computedExpression});`);
  return `${fieldName}()`;
}

function escapeTemplateEventExpression(expression: string): string {
  return expression
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

function trackGeneratedMethod(node: UiNode, context: RenderContext): void {
  for (const event of node.events) {
    if (!event.generatedMethod || context.requiredGeneratedMethodNames.has(event.generatedMethod.name)) {
      continue;
    }

    context.requiredGeneratedMethodNames.add(event.generatedMethod.name);
    context.requiredGeneratedMethods.push(event);
  }
}

function renderEvents(node: UiNode, context: RenderContext): string {
  if (!node.events.length) return '';
  const renderedEvents = node.events.flatMap(event => {
    if (event.behavior === 'unsupported') {
      return [];
    }

    if (event.behavior === 'method' && event.generatedMethod) {
      trackGeneratedMethod(node, context);
      return [`(${event.angularEvent})="${escapeTemplateEventExpression(`${event.generatedMethod.name}()`)}"`];
    }

    if (event.behavior === 'inline' && event.handlerModel?.kind === 'call') {
      return [`(${event.angularEvent})="${escapeTemplateEventExpression(event.handlerModel.expression)}"`];
    }

    return [];
  });

  return renderedEvents.length > 0 ? ` ${renderedEvents.join(' ')}` : '';
}

function renderContainer(node: UiNode, context: RenderContext, diagnosticsEmitter: DiagnosticsEmitter): string {
  const className = containerClassName(node);
  const content = node.children.map(child => renderNodeFromRegistry(child, context, diagnosticsEmitter)).filter(Boolean).join('\n');
  return `<div class="${className}"${renderEvents(node, context)}>${content ? `\n${content}\n` : ''}</div>`;
}

function renderText(node: UiNode, context: RenderContext): string {
  const textExpr = bindingLiteralOrExpr(node.text, 'text', context);
  return `<span${renderEvents(node, context)}>{{ ${textExpr} }}</span>`;
}

function renderInput(node: UiNode, context: RenderContext): string {
  const placeholderExpr = bindingLiteralOrExpr(node.placeholder, 'placeholder', context);
  return [
    `<mat-form-field appearance="outline"${renderEvents(node, context)}>`,
    `  <input matInput ${renderBoundAttribute('placeholder', placeholderExpr)}>`,
    '</mat-form-field>'
  ].join('\n');
}

function renderImage(node: UiNode, context: RenderContext): string {
  const sourceExpr = bindingLiteralOrExpr(node.source, 'imageSource', context);
  return `<img class="qml-image"${renderEvents(node, context)} ${renderBoundAttribute('src', sourceExpr)}>`;
}

function renderButton(node: UiNode, context: RenderContext): string {
  const textExpr = bindingLiteralOrExpr(node.text, 'buttonText', context);
  return `<button mat-raised-button${renderEvents(node, context)}>{{ ${textExpr} }}</button>`;
}

function renderAnimation(node: UiNode): string {
  return node.name
    ? `<!-- qml-ng unsupported: ignored ${node.name.replace(/--/g, '—').trim()} node. -->`
    : '';
}

function renderUnknown(node: UiNode, _context: RenderContext, diagnosticsEmitter: DiagnosticsEmitter): string {
  return diagnosticsEmitter.renderUnsupportedNode(node);
}

function resolveStringList(rule: NodeStringListRule | undefined, node: UiNode): string[] {
  if (!rule) {
    return [];
  }

  const resolved = typeof rule === 'function' ? rule(node) : rule;
  return [...resolved];
}

function resolveString(rule: NodeStringRule, node: UiNode): string {
  return typeof rule === 'function' ? rule(node) : rule;
}

function resolveCategory(rule: NodeCategoryRule, node: UiNode): UiNodeMappingCategory {
  return typeof rule === 'function' ? rule(node) : rule;
}

const UI_NODE_RENDER_REGISTRY: Record<UiNode['kind'], UiNodeRenderRuleDefinition> = {
  container: {
    templateRenderer: renderContainer,
    templateDescription: node => `div.${containerClassName(node)}`,
    mappingCategory: 'approximated',
    rendererKind: 'angular',
    themeHooks: ['layout-container-styles'],
    accessibilityRules: ['Container mappings preserve structure and events but do not infer ARIA semantics automatically.']
  },
  text: {
    templateRenderer: renderText,
    templateDescription: 'span with Angular interpolation',
    mappingCategory: 'supported',
    rendererKind: 'angular',
    accessibilityRules: ['Text content is escaped through Angular interpolation.']
  },
  input: {
    templateRenderer: renderInput,
    templateDescription: 'mat-form-field + input[matInput]',
    mappingCategory: 'approximated',
    rendererKind: 'material',
    materialImports: ['MatFormFieldModule', 'MatInputModule'],
    themeHooks: ['material-form-field-theme'],
    accessibilityRules: ['Current TextField mapping preserves placeholder text but does not yet synthesize a visible label.']
  },
  button: {
    templateRenderer: renderButton,
    templateDescription: 'button[mat-raised-button]',
    mappingCategory: 'supported',
    rendererKind: 'material',
    materialImports: ['MatButtonModule'],
    themeHooks: ['material-button-theme'],
    accessibilityRules: ['Buttons should expose a text label or a future aria-label mapping.']
  },
  image: {
    templateRenderer: renderImage,
    templateDescription: 'img.qml-image',
    mappingCategory: 'supported',
    rendererKind: 'angular',
    accessibilityRules: ['Image mappings preserve the src binding but do not infer alt text automatically.']
  },
  animation: {
    templateRenderer: renderAnimation,
    templateDescription: 'no emitted markup',
    mappingCategory: 'unsupported',
    rendererKind: 'none',
    accessibilityRules: ['Non-visual animation nodes are skipped conservatively until an explicit Angular strategy exists.']
  },
  unknown: {
    templateRenderer: renderUnknown,
    templateDescription: node => `unsupported placeholder for ${node.name ?? 'unknown'}`,
    mappingCategory: 'unsupported',
    rendererKind: 'placeholder',
    accessibilityRules: ['Unsupported nodes render explicit placeholders so missing semantics stay visible in generated output.']
  }
};

export function getUiNodeRenderRule(node: UiNode): UiNodeRenderRule {
  const rule = UI_NODE_RENDER_REGISTRY[node.kind];
  return {
    templateRenderer: rule.templateRenderer,
    templateDescription: resolveString(rule.templateDescription, node),
    angularImports: resolveStringList(rule.angularImports, node),
    materialImports: resolveStringList(rule.materialImports, node),
    themeHooks: resolveStringList(rule.themeHooks, node),
    accessibilityRules: resolveStringList(rule.accessibilityRules, node),
    mappingCategory: resolveCategory(rule.mappingCategory, node),
    rendererKind: rule.rendererKind
  };
}

export function renderNodeFromRegistry(node: UiNode, context: RenderContext, diagnosticsEmitter: DiagnosticsEmitter): string {
  return getUiNodeRenderRule(node).templateRenderer(node, context, diagnosticsEmitter);
}

export function collectComponentImportsFromRegistry(root: UiNode): string[] {
  const imports = new Set<string>();

  function walk(node: UiNode): void {
    const rule = getUiNodeRenderRule(node);
    for (const importName of [...rule.angularImports, ...rule.materialImports]) {
      imports.add(importName);
    }
    node.children.forEach(walk);
  }

  walk(root);
  return [...imports].sort();
}
