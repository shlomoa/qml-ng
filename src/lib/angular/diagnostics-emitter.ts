import { DiagnosticsEmitter, RenderContext } from './renderer-contract';

/**
 * Default implementation of diagnostics and code comments emitter
 */
export class DefaultDiagnosticsEmitter implements DiagnosticsEmitter {
  addDiagnostic(ctx: RenderContext, message: string): void {
    ctx.diagnostics.push(message);
  }

  addComment(ctx: RenderContext, comment: string): void {
    ctx.comments.push(comment);
  }

  renderDiagnostics(ctx: RenderContext): string {
    if (ctx.diagnostics.length === 0 && ctx.comments.length === 0) {
      return '';
    }

    const lines: string[] = [];

    // Render general comments first
    if (ctx.comments.length > 0) {
      lines.push('/**');
      for (const comment of ctx.comments) {
        lines.push(` * ${comment}`);
      }
      lines.push(' */');
    }

    // Render diagnostics as warnings
    if (ctx.diagnostics.length > 0) {
      lines.push('/**');
      lines.push(' * WARNINGS:');
      for (const diagnostic of ctx.diagnostics) {
        lines.push(` * - ${diagnostic}`);
      }
      lines.push(' */');
    }

    return lines.join('\n');
  }
}
