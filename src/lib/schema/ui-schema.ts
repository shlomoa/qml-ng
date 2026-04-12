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

export interface UiEvent {
  name: string;
  angularEvent: string;
  handler: string;
}

export interface UiLayout {
  fillParent?: boolean;
  centerInParent?: boolean;
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
