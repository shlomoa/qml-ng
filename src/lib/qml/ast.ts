export type QmlValue =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'identifier'; value: string }
  | { kind: 'expression'; value: string };

export interface QmlProperty {
  name: string;
  value: QmlValue;
}

export interface QmlObjectNode {
  kind: 'object';
  typeName: string;
  properties: QmlProperty[];
  children: QmlObjectNode[];
}

export interface QmlDocument {
  root: QmlObjectNode;
}
