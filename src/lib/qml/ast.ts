import { SourceLocation, SourceRange } from '../schema/ui-schema';

export type QmlValue =
  | { kind: 'string'; value: string; location?: SourceRange }
  | { kind: 'number'; value: number; location?: SourceRange }
  | { kind: 'identifier'; value: string; location?: SourceRange }
  | { kind: 'expression'; value: string; location?: SourceRange }
  | { kind: 'array'; elements: QmlValue[]; location?: SourceRange }
  | { kind: 'binding'; expression: string; dependencies: string[]; location?: SourceRange };

export type QmlPropertyKind = 'simple' | 'typed' | 'readonly' | 'required' | 'default' | 'alias';

export interface QmlProperty {
  name: string;
  value: QmlValue;
  embeddedObject?: QmlObjectNode;
  propertyKind?: QmlPropertyKind;
  typeName?: string;
  location?: SourceRange;
}

export interface QmlHandler {
  name: string;
  body: string;
  location?: SourceRange;
}

export interface QmlSignal {
  name: string;
  parameters: Array<{ name: string; type?: string }>;
  location?: SourceRange;
}

export interface QmlFunction {
  name: string;
  parameters: Array<{ name: string; type?: string }>;
  body: string;
  location?: SourceRange;
}

export interface QmlObjectNode {
  kind: 'object';
  typeName: string;
  properties: QmlProperty[];
  handlers: QmlHandler[];
  signals: QmlSignal[];
  functions: QmlFunction[];
  children: QmlObjectNode[];
  resolvedSourcePath?: string;
  location?: SourceRange;
}

export interface QmlImport {
  module: string;
  version?: string;
  alias?: string;
  location?: SourceRange;
}

export interface QmlPragma {
  name: string;
  value?: string;
  location?: SourceRange;
}

export interface QmlDocument {
  root: QmlObjectNode;
  imports: QmlImport[];
  pragmas: QmlPragma[];
}
