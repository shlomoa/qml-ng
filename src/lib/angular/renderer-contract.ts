import { UiDocument, UiEvent, UiNode, UiStateDeclaration } from '../schema/ui-schema';

export interface RenderedAngularComponent {
  ts: string;
  html: string;
  scss: string;
}

export interface RenderContext {
  /** Computed class members discovered while rendering HTML bindings. */
  computedDeclarations: string[];
  /** Expression dependencies that may need fallback signal declarations in TypeScript. */
  dependencyNames: Set<string>;
  /** Typed QML properties already promoted to Angular signals. */
  declaredSignalNames: Set<string>;
  /** Event handlers that require generated component methods, in first-seen order. */
  requiredGeneratedMethods: UiEvent[];
  /** De-duplication set paired with requiredGeneratedMethods. */
  requiredGeneratedMethodNames: Set<string>;
  /** Monotonic counter used to create deterministic computed field names. */
  computedExpressionCounter: number;
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
    computedExpressionCounter: 0
  };
}
