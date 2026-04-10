/**
 * Angular Material renderer orchestrator
 * Coordinates sub-renderers to produce complete Angular components
 */

import { UiDocument } from '../schema/ui-schema';
import {
  RenderedAngularComponent,
  RenderContext,
  ImportsResolver,
  NamingService,
  TypeScriptRenderer,
  HtmlRenderer,
  ScssRenderer,
  DiagnosticsEmitter
} from './renderer-contract';
import { DefaultImportsResolver } from './imports-resolver';
import { DefaultNamingService } from './naming-service';
import { DefaultTypeScriptRenderer } from './typescript-renderer';
import { DefaultHtmlRenderer } from './html-renderer';
import { DefaultScssRenderer } from './scss-renderer';
import { DefaultDiagnosticsEmitter } from './diagnostics-emitter';

// Re-export for backward compatibility
export { RenderedAngularComponent };

/**
 * Main renderer that orchestrates all sub-renderers
 */
export class AngularMaterialRenderer {
  constructor(
    private importsResolver: ImportsResolver = new DefaultImportsResolver(),
    private namingService: NamingService = new DefaultNamingService(),
    private tsRenderer: TypeScriptRenderer = new DefaultTypeScriptRenderer(),
    private htmlRenderer: HtmlRenderer = new DefaultHtmlRenderer(),
    private scssRenderer: ScssRenderer = new DefaultScssRenderer(),
    private diagnosticsEmitter: DiagnosticsEmitter = new DefaultDiagnosticsEmitter()
  ) {}

  render(doc: UiDocument): RenderedAngularComponent {
    // Initialize render context
    const ctx: RenderContext = {
      componentName: doc.name,
      selector: this.namingService.generateSelector(doc.name),
      fileName: doc.name,
      computedDeclarations: [],
      signalDeclarations: [],
      dependencyNames: new Set<string>(),
      exprCounter: 0,
      diagnostics: [...doc.diagnostics],
      comments: []
    };

    // Render HTML first (populates ctx with computed/signal declarations)
    const html = this.htmlRenderer.render(doc.root, ctx);

    // Collect imports
    const angularImports = this.importsResolver.collectAngularImports(ctx);
    const materialImports = this.importsResolver.collectMaterialImports(doc.root);
    const importsBlock = this.importsResolver.renderImports(angularImports, materialImports);

    // Render TypeScript
    const ts = [
      importsBlock,
      '',
      this.tsRenderer.render(doc, ctx, materialImports)
    ].join('\n');

    // Render SCSS
    const scss = this.scssRenderer.render(doc.root, ctx);

    return { ts, html, scss };
  }
}

/**
 * Legacy function for backward compatibility
 * Uses the new modular renderer under the hood
 */
export function renderAngularMaterial(doc: UiDocument, className: string): RenderedAngularComponent {
  const renderer = new AngularMaterialRenderer();
  return renderer.render(doc);
}
