export type QmlValue =
  | { kind: 'string'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'identifier'; value: string }
  | { kind: 'expression'; value: string };

export interface QmlProperty {
  name: string;
  value: QmlValue;
  embeddedObject?: QmlObjectNode;
}

export interface QmlObjectNode {
  kind: 'object';
  typeName: string;
  properties: QmlProperty[];
  children: QmlObjectNode[];
  resolvedSourcePath?: string;
}

export interface QmlDocument {
  root: QmlObjectNode;
}
