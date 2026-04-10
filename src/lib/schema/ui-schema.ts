export type UiNode =
  | UiContainerNode
  | UiTextNode
  | UiInputNode
  | UiButtonNode
  | UiUnsupportedNode;

export interface UiDocument {
  version: '1.0';
  root: UiNode;
  diagnostics: ConversionDiagnostic[];
}

export interface ConversionDiagnostic {
  level: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  path?: string;
}

export interface UiBaseNode {
  kind: string;
  id?: string;
  source?: SourceRange;
}

export interface SourceRange {
  start: number;
  end: number;
}

export interface UiContainerNode extends UiBaseNode {
  kind: 'container';
  layout: 'row' | 'column' | 'stack';
  spacing?: number;
  children: UiNode[];
}

export interface UiTextNode extends UiBaseNode {
  kind: 'text';
  text: string;
  role?: 'title' | 'body' | 'label';
}

export interface UiInputNode extends UiBaseNode {
  kind: 'input';
  inputType: 'text' | 'number' | 'password';
  placeholder?: string;
  label?: string;
}

export interface UiButtonNode extends UiBaseNode {
  kind: 'button';
  text: string;
  variant?: 'flat' | 'raised' | 'stroked';
}

export interface UiUnsupportedNode extends UiBaseNode {
  kind: 'unsupported';
  qmlType: string;
  reason: string;
  raw?: string;
}
