import { HtmlRenderer, RenderContext } from './renderer-contract';
import { DefaultDiagnosticsEmitter } from './diagnostics-emitter';
import { UiBinding, UiNode } from '../schema/ui-schema';
import { lowerBinding } from '../converter/expression-lowering';

/**
 * Default implementation of HTML template renderer
 * Generates Angular Material template markup
 */
export class DefaultHtmlRenderer implements HtmlRenderer {
  private diagnostics = new DefaultDiagnosticsEmitter();

  render(root: UiNode, ctx: RenderContext): string {
    return this.renderNode(root, ctx);
  }

  private renderNode(node: UiNode, ctx: RenderContext): string {
    switch (node.kind) {
      case 'container':
        return this.renderContainer(node, ctx);
      case 'text':
        return this.renderText(node, ctx);
      case 'input':
        return this.renderInput(node, ctx);
      case 'button':
        return this.renderButton(node, ctx);
      case 'image':
        return this.renderImage(node, ctx);
      case 'animation':
        return this.renderAnimation(node, ctx);
      case 'unknown':
      default:
        return this.renderUnknown(node, ctx);
    }
  }

  private renderContainer(node: UiNode, ctx: RenderContext): string {
    const className = this.containerClassName(node);
    const events = this.renderEvents(node);
    const content = node.children
      .map(child => this.renderNode(child, ctx))
      .filter(Boolean)
      .join('\n');

    return `<div class="${className}"${events}>${content ? `\n${content}\n` : ''}</div>`;
  }

  private renderText(node: UiNode, ctx: RenderContext): string {
    const textExpr = this.bindingLiteralOrExpr(node.text, 'text', ctx);
    const events = this.renderEvents(node);
    return `<span${events}>{{ ${textExpr} }}</span>`;
  }

  private renderInput(node: UiNode, ctx: RenderContext): string {
    const placeholderExpr = this.bindingLiteralOrExpr(node.placeholder, 'placeholder', ctx);
    const events = this.renderEvents(node);
    return [
      `<mat-form-field appearance="outline"${events}>`,
      `  <input matInput ${this.renderBoundAttribute('placeholder', placeholderExpr)}>`,
      `</mat-form-field>`
    ].join('\n');
  }

  private renderButton(node: UiNode, ctx: RenderContext): string {
    const textExpr = this.bindingLiteralOrExpr(node.text, 'buttonText', ctx);
    const events = this.renderEvents(node);
    return `<button mat-raised-button${events}>{{ ${textExpr} }}</button>`;
  }

  private renderImage(node: UiNode, ctx: RenderContext): string {
    const sourceExpr = this.bindingLiteralOrExpr(node.source, 'imageSource', ctx);
    const events = this.renderEvents(node);
    return `<img class="qml-image"${events} ${this.renderBoundAttribute('src', sourceExpr)}>`;
  }

  private renderAnimation(node: UiNode, ctx: RenderContext): string {
    // Animations are not rendered in the template
    this.diagnostics.addComment(ctx, `Animation node '${node.name ?? 'unknown'}' is not supported and was omitted from output`);
    return '';
  }

  private renderUnknown(node: UiNode, ctx: RenderContext): string {
    const message = `Unsupported QML type: ${node.name ?? 'unknown'}`;
    this.diagnostics.addDiagnostic(ctx, message);
    return `<!-- ${message} -->`;
  }

  private containerClassName(node: UiNode): string {
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

  private renderEvents(node: UiNode): string {
    if (!node.events.length) return '';
    return ' ' + node.events.map(e => `(${e.angularEvent})="${e.handler}"`).join(' ');
  }

  private renderBoundAttribute(name: string, expression: string): string {
    const escapedExpression = expression
      .replace(/&/g, '&amp;')
      .replace(/'/g, '&#39;');
    return `[${name}]='${escapedExpression}'`;
  }

  private bindingLiteralOrExpr(binding: UiBinding | undefined, fieldPrefix: string, ctx: RenderContext): string {
    if (!binding) return "''";

    if (binding.kind === 'literal') {
      return JSON.stringify(binding.value ?? '');
    }

    // Expression binding - generate computed property
    binding.dependencies.forEach(d => ctx.dependencyNames.add(d));
    const lowered = lowerBinding(binding.expression ?? '');
    const fieldName = `${fieldPrefix}Expr${++ctx.exprCounter}`;
    ctx.computedDeclarations.push(`readonly ${fieldName} = computed(() => ${lowered.angularExpression});`);
    return `${fieldName}()`;
  }
}
