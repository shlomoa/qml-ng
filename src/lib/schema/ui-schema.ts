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
}

export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface UiDiagnostic {
  severity: DiagnosticSeverity;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  /** Original source position (character offset) */
  position?: number;
}

export interface UiDocument {
  name: string;
  root: UiNode;
  diagnostics: UiDiagnostic[];
}
