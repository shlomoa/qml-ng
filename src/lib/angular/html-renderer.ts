import { lowerBinding } from '../converter/expression-lowering';
import { layoutToCssDeclarations } from '../converter/layout-resolver';
import { isFlowLayoutContainer, suppressAbsolutePositioning } from '../layout/layout-utils';
import { UiBinding, UiEvent, UiNode } from '../schema/ui-schema';
import { DiagnosticsEmitter, HtmlRenderer, RenderContext } from './renderer-contract';

const SAFE_COMPUTED_EXPRESSION_PATTERN = /^[\w\s.$()[\]?:"',+\-*/%<>=!&|]+$/;

function sanitizeAngularComputedExpression(expression: string): { expression: string; comment?: string } {
  if (SAFE_COMPUTED_EXPRESSION_PATTERN.test(expression)) {
    return { expression };
  }

  return {
    expression: 'undefined',
    comment: '/* TODO(qml-ng): Unsupported binding expression sanitized during Angular emission. */'
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

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderStyleAttribute(node: UiNode, parent: UiNode | undefined): string {
  if (!node.layout) return '';
  if (!parent) {
    // Root layout is emitted on :host by the SCSS renderer to avoid duplicating host-level positioning.
    return '';
  }

  const layout = isFlowLayoutContainer(parent)
    ? suppressAbsolutePositioning(node.layout)
    : node.layout;

  const declarations = layoutToCssDeclarations(layout);
  if (!declarations.length) {
    return '';
  }

  return ` style="${escapeHtmlAttribute(declarations.join(' '))}"`;
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

function trackGeneratedMethod(event: UiEvent, context: RenderContext): void {
  if (!event.generatedMethod || context.requiredGeneratedMethodNames.has(event.generatedMethod.name)) {
    return;
  }

  context.requiredGeneratedMethodNames.add(event.generatedMethod.name);
  context.requiredGeneratedMethods.push(event);
}

function renderEvents(node: UiNode, context: RenderContext): string {
  if (!node.events.length) return '';
  const renderedEvents = node.events.flatMap(event => {
    if (event.behavior === 'unsupported') {
      return [];
    }

    if (event.behavior === 'method' && event.generatedMethod) {
      trackGeneratedMethod(event, context);
      return [`(${event.angularEvent})="${escapeTemplateEventExpression(`${event.generatedMethod.name}()`)}"`];
    }

    if (event.behavior === 'inline' && event.handlerModel?.kind === 'call') {
      return [`(${event.angularEvent})="${escapeTemplateEventExpression(event.handlerModel.expression)}"`];
    }

    return [];
  });

  return renderedEvents.length > 0 ? ` ${renderedEvents.join(' ')}` : '';
}

function renderNode(
  node: UiNode,
  context: RenderContext,
  diagnosticsEmitter: DiagnosticsEmitter,
  parent?: UiNode
): string {
  switch (node.kind) {
    case 'container': {
      const className = containerClassName(node);
      const content = node.children.map(child => renderNode(child, context, diagnosticsEmitter, node)).filter(Boolean).join('\n');
      return `<div class="${className}"${renderStyleAttribute(node, parent)}${renderEvents(node, context)}>${content ? `\n${content}\n` : ''}</div>`;
    }

    case 'text': {
      const textExpr = bindingLiteralOrExpr(node.text, 'text', context);
      return `<span${renderStyleAttribute(node, parent)}${renderEvents(node, context)}>{{ ${textExpr} }}</span>`;
    }

    case 'input': {
      const placeholderExpr = bindingLiteralOrExpr(node.placeholder, 'placeholder', context);
      return [
        `<mat-form-field appearance="outline"${renderStyleAttribute(node, parent)}${renderEvents(node, context)}>`,
        `  <input matInput ${renderBoundAttribute('placeholder', placeholderExpr)}>`,
        '</mat-form-field>'
      ].join('\n');
    }

    case 'image': {
      const sourceExpr = bindingLiteralOrExpr(node.source, 'imageSource', context);
      return `<img class="qml-image"${renderStyleAttribute(node, parent)}${renderEvents(node, context)} ${renderBoundAttribute('src', sourceExpr)}>`;
    }

    case 'button': {
      const textExpr = bindingLiteralOrExpr(node.text, 'buttonText', context);
      return `<button mat-raised-button${renderStyleAttribute(node, parent)}${renderEvents(node, context)}>{{ ${textExpr} }}</button>`;
    }

    case 'animation':
      return '';

    case 'unknown':
    default:
      return diagnosticsEmitter.renderUnsupportedNode(node);
  }
}

export class AngularHtmlRenderer implements HtmlRenderer {
  constructor(private readonly diagnosticsEmitter: DiagnosticsEmitter) {}

  render(root: UiNode, context: RenderContext): string {
    return renderNode(root, context, this.diagnosticsEmitter);
  }
}
