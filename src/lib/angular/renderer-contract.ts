import { UiDocument, UiEvent, UiNode, UiStateDeclaration } from '../schema/ui-schema';

export interface RenderedAngularComponent {
  ts: string;
  html: string;
  scss: string;
}

export interface RenderContext {
  computedDeclarations: string[];
  dependencyNames: Set<string>;
  declaredSignalNames: Set<string>;
  requiredGeneratedMethods: UiEvent[];
  requiredGeneratedMethodNames: Set<string>;
  exprCounter: number;
}

export interface ImportsResolver {
  collectComponentImports(root: UiNode): string[];
  renderImportStatements(imports: string[]): string[];
}

export interface NamingService {
  componentSelector(doc: UiDocument): string;
  templateUrl(doc: UiDocument): string;
  styleUrl(doc: UiDocument): string;
}

export interface DiagnosticsEmitter {
  renderUnsupportedNode(node: UiNode): string;
  renderHandlerComment(handler: string): string;
}

export interface HtmlRenderer {
  render(root: UiNode, context: RenderContext): string;
}

export interface ScssRenderer {
  render(root: UiNode): string;
}

export interface TypeScriptRenderer {
  collectStateDeclarations(root: UiNode): UiStateDeclaration[];
  render(doc: UiDocument, className: string, context: RenderContext, stateDeclarations: UiStateDeclaration[]): string;
}

export interface AngularRendererContract {
  readonly html: HtmlRenderer;
  readonly scss: ScssRenderer;
  readonly imports: ImportsResolver;
  readonly naming: NamingService;
  readonly diagnostics: DiagnosticsEmitter;
  readonly typescript: TypeScriptRenderer;
  render(doc: UiDocument, className: string): RenderedAngularComponent;
}

export function createRenderContext(declaredSignalNames: Set<string>): RenderContext {
  return {
    computedDeclarations: [],
    dependencyNames: new Set<string>(),
    declaredSignalNames,
    requiredGeneratedMethods: [],
    requiredGeneratedMethodNames: new Set<string>(),
    exprCounter: 0
  };
}
