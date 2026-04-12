import { UiDocument } from '../schema/ui-schema';
import { AngularDiagnosticsEmitter } from './diagnostics-emitter';
import { AngularHtmlRenderer } from './html-renderer';
import { MaterialImportsResolver } from './imports-resolver';
import { AngularNamingService } from './naming-service';
import {
  AngularRendererContract,
  createRenderContext,
  DiagnosticsEmitter,
  HtmlRenderer,
  ImportsResolver,
  NamingService,
  RenderedAngularComponent,
  ScssRenderer,
  TypeScriptRenderer
} from './renderer-contract';
import { AngularScssRenderer } from './scss-renderer';
import { AngularTypeScriptRenderer } from './typescript-renderer';

export class AngularMaterialRenderer implements AngularRendererContract {
  readonly html: HtmlRenderer;
  readonly scss: ScssRenderer;
  readonly imports: ImportsResolver;
  readonly naming: NamingService;
  readonly diagnostics: DiagnosticsEmitter;
  readonly typescript: TypeScriptRenderer;

  constructor(
    importsResolver: ImportsResolver = new MaterialImportsResolver(),
    namingService: NamingService = new AngularNamingService(),
    diagnosticsEmitter: DiagnosticsEmitter = new AngularDiagnosticsEmitter(),
    htmlRenderer?: HtmlRenderer,
    scssRenderer: ScssRenderer = new AngularScssRenderer(),
    typescriptRenderer?: TypeScriptRenderer
  ) {
    this.imports = importsResolver;
    this.naming = namingService;
    this.diagnostics = diagnosticsEmitter;
    this.html = htmlRenderer ?? new AngularHtmlRenderer(this.diagnostics);
    this.scss = scssRenderer;
    this.typescript = typescriptRenderer ?? new AngularTypeScriptRenderer(this.imports, this.naming, this.diagnostics);
  }

  render(doc: UiDocument, className: string): RenderedAngularComponent {
    const stateDeclarations = this.typescript.collectStateDeclarations(doc.root);
    const context = createRenderContext(new Set(stateDeclarations.map(declaration => declaration.name)));
    const html = this.html.render(doc.root, context);
    const ts = this.typescript.render(doc, className, context, stateDeclarations);
    const scss = this.scss.render(doc.root);

    return { ts, html, scss };
  }
}

const defaultRenderer = new AngularMaterialRenderer();

export function renderAngularMaterial(doc: UiDocument, className: string): RenderedAngularComponent {
  return defaultRenderer.render(doc, className);
}
