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
  kind: 'container' | 'text' | 'input' | 'button' | 'unknown';
  id?: string;
  name?: string;
  text?: UiBinding;
  placeholder?: UiBinding;
  layout?: UiLayout;
  events: UiEvent[];
  children: UiNode[];
  meta?: Record<string, unknown>;
}

export interface UiDocument {
  name: string;
  root: UiNode;
  diagnostics: string[];
}
