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

function collectChildObjects(node: QmlObjectNode): QmlObjectNode[] {
  return [
    ...node.children,
    ...node.properties.flatMap(property => property.embeddedObject ? [property.embeddedObject] : [])
  ];
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
    case 'Window':
    case 'QtObject':
    case 'Component':
      return {
        kind: 'container',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics),
        meta: { role: node.typeName === 'Window' ? 'window' : 'structural' }
      };

    case 'Item':
    case 'Rectangle':
      return {
        kind: 'container',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics),
        meta: { role: 'group' }
      };

    case 'Column':
    case 'ColumnLayout':
      return {
        kind: 'container',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics),
        meta: { orientation: 'column', layoutKind: node.typeName === 'ColumnLayout' ? 'column-layout' : 'column' }
      };

    case 'Row':
    case 'RowLayout':
      return {
        kind: 'container',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics),
        meta: { orientation: 'row', layoutKind: node.typeName === 'RowLayout' ? 'row-layout' : 'row' }
      };

    case 'StackLayout':
      return {
        kind: 'container',
        name: 'StackLayout',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics),
        meta: { layoutKind: 'stack' }
      };

    case 'GridLayout':
      return {
        kind: 'container',
        name: 'GridLayout',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics),
        meta: { layoutKind: 'grid' }
      };

    case 'FlexboxLayout':
      return {
        kind: 'container',
        name: 'FlexboxLayout',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics),
        meta: { layoutKind: 'flexbox' }
      };

    case 'ScrollView':
      return {
        kind: 'container',
        name: 'ScrollView',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics),
        meta: { role: 'scroll-view' }
      };

    case 'ShapePath':
      return {
        kind: 'container',
        name: 'ShapePath',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics),
        meta: { role: 'shape-path' }
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

    case 'Image': {
      const raw = propertyText(node.properties, 'source') ?? '""';
      return {
        kind: 'image',
        name: 'Image',
        source: lowerBinding(raw).binding,
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

    case 'KeyframeGroup':
    case 'PathArc':
    case 'PathLine':
    case 'PathMove':
    case 'PathSvg':
    case 'PathText':
      return {
        kind: 'animation',
        name: node.typeName,
        events,
        children: [],
        meta: { ignored: true }
      };

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
        children: children(collectChildObjects(node), diagnostics),
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
