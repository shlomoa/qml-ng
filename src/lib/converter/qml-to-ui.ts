import { QmlDocument, QmlObjectNode, QmlProperty } from '../qml/ast';
import { lowerBinding } from './expression-lowering';
import { isQmlHandlerName, mapQmlHandler } from './event-mapper';
import { resolveLayout } from './layout-resolver';
import { UiDocument, UiNode } from '../schema/ui-schema';

function propertyMap(properties: QmlProperty[]): Map<string, QmlProperty> {
  return new Map(properties.map(p => [p.name, p]));
}

function propertyText(properties: QmlProperty[], name: string): string | undefined {
  const value = propertyMap(properties).get(name)?.value;
  if (!value) return undefined;
  if (value.kind === 'string') return JSON.stringify(value.value);
  if (value.kind === 'number') return String(value.value);
  return value.value;
}

function children(nodes: QmlObjectNode[], diagnostics: string[]): UiNode[] {
  return nodes.map(node => qmlNodeToUi(node, diagnostics));
}

function qmlValueToHandler(value: QmlProperty['value']): string {
  switch (value.kind) {
    case 'string':
    case 'identifier':
    case 'expression':
      return value.value;
    case 'number':
      return String(value.value);
  }
}

export function qmlNodeToUi(node: QmlObjectNode, diagnostics: string[]): UiNode {
  const props = propertyMap(node.properties);
  const events = node.properties
    .filter(p => isQmlHandlerName(p.name))
    .map(p => mapQmlHandler(p.name, qmlValueToHandler(p.value)));

  const layout = resolveLayout(node.properties);

  switch (node.typeName) {
    case 'Column':
      return {
        kind: 'container',
        name: 'Column',
        layout,
        events,
        children: children(node.children, diagnostics),
        meta: { orientation: 'column' }
      };

    case 'Row':
      return {
        kind: 'container',
        name: 'Row',
        layout,
        events,
        children: children(node.children, diagnostics),
        meta: { orientation: 'row' }
      };

    case 'Text': {
      const raw = propertyText(node.properties, 'text') ?? '"TODO"';
      return {
        kind: 'text',
        name: 'Text',
        text: lowerBinding(raw).binding,
        layout,
        events,
        children: []
      };
    }

    case 'TextField': {
      const raw = propertyText(node.properties, 'placeholderText') ?? '""';
      return {
        kind: 'input',
        name: 'TextField',
        placeholder: lowerBinding(raw).binding,
        layout,
        events,
        children: []
      };
    }

    case 'Button': {
      const raw = propertyText(node.properties, 'text') ?? '"Button"';
      return {
        kind: 'button',
        name: 'Button',
        text: lowerBinding(raw).binding,
        layout,
        events,
        children: []
      };
    }

    default:
      diagnostics.push(`Unsupported QML type: ${node.typeName}`);
      return {
        kind: 'unknown',
        name: node.typeName,
        layout,
        events,
        children: children(node.children, diagnostics),
        meta: { unsupported: true }
      };
  }
}

export function qmlToUiDocument(name: string, qml: QmlDocument): UiDocument {
  const diagnostics: string[] = [];
  return {
    name,
    root: qmlNodeToUi(qml.root, diagnostics),
    diagnostics
  };
}
