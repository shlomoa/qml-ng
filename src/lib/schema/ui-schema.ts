export interface SourceLocation {
  line: number;
  column: number;
  position: number;
}

export interface SourceRange {
  start: SourceLocation;
  end: SourceLocation;
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';
export type DiagnosticCategory = 'lexical' | 'syntax' | 'semantic' | 'unsupported';
export type UiLayoutFidelity = 'exact' | 'approximate' | 'unsupported';

export interface UiDiagnostic {
  severity: DiagnosticSeverity;
  category: DiagnosticCategory;
  message: string;
  file?: string;
  location?: SourceRange;
  code?: string;
}

export interface UiBinding {
  kind: 'literal' | 'expression';
  value?: string | number | boolean;
  expression?: string;
  dependencies: string[];
}

/**
 * A typed state declaration extracted from a QML property declaration.
 * These map to Angular Signal declarations in the generated component.
 *
 * Examples:
 *   `property int count: 0`      → `readonly count = signal<number>(0);`
 *   `property string label: "x"` → `readonly label = signal<string>('x');`
 *   `readonly property bool on`  → `readonly on = signal<boolean>(false);`
 */
export interface UiStateDeclaration {
  name: string;
  /** TypeScript type for the signal generic parameter, e.g. 'number', 'string', 'boolean', 'any' */
  tsType: string;
  /** The Angular/TypeScript expression used as the signal's initial value */
  initialValue: string;
  /** Whether the original QML property was declared readonly */
  isReadonly: boolean;
  location?: SourceRange;
}

export type UiHandlerBehavior = 'inline' | 'method' | 'unsupported';

export type UiHandlerModel =
  | { kind: 'call'; expression: string }
  | { kind: 'assignment'; target: string; value: string }
  | { kind: 'unsupported'; reason: string };

export interface UiGeneratedMethod {
  name: string;
}

export interface UiEvent {
  name: string;
  angularEvent: string;
  handler: string;
  behavior?: UiHandlerBehavior;
  handlerModel?: UiHandlerModel;
  generatedMethod?: UiGeneratedMethod;
  location?: SourceRange;
}

export interface UiLayout {
  fillParent?: boolean;
  centerInParent?: boolean;
  anchorLeftParent?: boolean;
  anchorRightParent?: boolean;
  anchorTopParent?: boolean;
  anchorBottomParent?: boolean;
  absoluteX?: string;
  absoluteY?: string;
  width?: string;
  height?: string;
  preferredWidth?: string;
  preferredHeight?: string;
  rules?: UiLayoutRule[];
}

export interface UiLayoutRule {
  source: string;
  fidelity: UiLayoutFidelity;
  detail: string;
}

export interface UiNode {
  kind: 'container' | 'text' | 'input' | 'button' | 'image' | 'animation' | 'unknown';
  id?: string;
  name?: string;
  text?: UiBinding;
  placeholder?: UiBinding;
  source?: UiBinding;
  layout?: UiLayout;
  events: UiEvent[];
  children: UiNode[];
  /** Typed property declarations extracted from QML (e.g. `property int count: 0`). */
  stateDeclarations?: UiStateDeclaration[];
  meta?: Record<string, unknown>;
  location?: SourceRange;
}

export interface UiDocument {
  name: string;
  root: UiNode;
  diagnostics: UiDiagnostic[];
}

export function createDiagnostic(
  severity: DiagnosticSeverity,
  category: DiagnosticCategory,
  message: string,
  location?: SourceRange,
  file?: string,
  code?: string
): UiDiagnostic {
  return { severity, category, message, location, file, code };
}

export function formatDiagnostic(diagnostic: UiDiagnostic): string {
  const formattedLocation = diagnostic.location
    ? `${diagnostic.location.start.line}:${diagnostic.location.start.column}`
    : undefined;
  const code = diagnostic.code ? `:${diagnostic.code}` : '';
  const filePrefix = formatDiagnosticPrefix(diagnostic.file, formattedLocation);
  return `${diagnostic.severity}${code}: ${filePrefix}${diagnostic.message}`;
}

function formatDiagnosticPrefix(file: string | undefined, formattedLocation: string | undefined): string {
  if (!file && !formattedLocation) {
    return '';
  }

  const filePart = file ?? '';
  const separator = file && formattedLocation ? ':' : '';
  const locationPart = formattedLocation ?? '';
  return `${filePart}${separator}${locationPart}: `;
}
