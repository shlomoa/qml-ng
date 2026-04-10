/**
 * Core renderer contract defining the interfaces for modular Angular rendering.
 *
 * This contract separates concerns:
 * - TypeScript generation (component class, signals, computed)
 * - HTML generation (template markup)
 * - SCSS generation (styles)
 * - Import resolution (Angular and Material dependencies)
 * - Naming conventions (consistent identifier generation)
 * - Diagnostics (warnings and comments for unsupported features)
 */

import { UiDocument, UiNode } from '../schema/ui-schema';

/**
 * Result of rendering a complete Angular component
 */
export interface RenderedAngularComponent {
  ts: string;
  html: string;
  scss: string;
}

/**
 * Context shared across rendering operations
 */
export interface RenderContext {
  /** Component name for the rendered output */
  componentName: string;
  /** Selector for the component */
  selector: string;
  /** File name base (without extension) */
  fileName: string;
  /** Computed property declarations */
  computedDeclarations: string[];
  /** Signal declarations */
  signalDeclarations: string[];
  /** Set of dependency identifiers from bindings */
  dependencyNames: Set<string>;
  /** Counter for generated expression identifiers */
  exprCounter: number;
  /** Diagnostics collected during rendering */
  diagnostics: string[];
  /** Comments to emit in generated code */
  comments: string[];
}

/**
 * Manages import statements for Angular and Material modules
 */
export interface ImportsResolver {
  /**
   * Collect required Angular core imports based on context
   */
  collectAngularImports(ctx: RenderContext): string[];

  /**
   * Collect required Material module imports by walking the UI tree
   */
  collectMaterialImports(root: UiNode): string[];

  /**
   * Render import statements as TypeScript source
   */
  renderImports(angularImports: string[], materialImports: string[]): string;
}

/**
 * Generates consistent identifier names
 */
export interface NamingService {
  /**
   * Generate a unique computed property name for a binding expression
   */
  generateComputedName(prefix: string, counter: number): string;

  /**
   * Generate a class name from a component name
   */
  generateClassName(componentName: string): string;

  /**
   * Generate a selector from a component name
   */
  generateSelector(componentName: string): string;
}

/**
 * Generates TypeScript component class source
 */
export interface TypeScriptRenderer {
  /**
   * Render the complete component class including:
   * - imports
   * - @Component decorator
   * - class declaration
   * - signal and computed declarations
   */
  render(doc: UiDocument, ctx: RenderContext, imports: string[]): string;
}

/**
 * Generates Angular template HTML
 */
export interface HtmlRenderer {
  /**
   * Render the complete template by walking the UI tree
   */
  render(root: UiNode, ctx: RenderContext): string;
}

/**
 * Generates component SCSS styles
 */
export interface ScssRenderer {
  /**
   * Render styles including:
   * - host styles
   * - layout classes
   * - per-node layout rules from schema
   */
  render(root: UiNode, ctx: RenderContext): string;
}

/**
 * Emits diagnostics and code comments for unsupported features
 */
export interface DiagnosticsEmitter {
  /**
   * Add a diagnostic message for an unsupported feature
   */
  addDiagnostic(ctx: RenderContext, message: string): void;

  /**
   * Add a comment to emit in generated code
   */
  addComment(ctx: RenderContext, comment: string): void;

  /**
   * Render diagnostics as TypeScript comments
   */
  renderDiagnostics(ctx: RenderContext): string;
}
