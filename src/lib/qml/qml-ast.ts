export interface QmlNode {
  type: string;
  properties: Record<string, string>;
  children: QmlNode[];
}
