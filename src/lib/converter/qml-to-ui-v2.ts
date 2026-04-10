import { QmlDocument, QmlObjectNode, QmlProperty, QmlHandler } from '../qml/ast';
import { lowerBinding } from './expression-lowering';
import { isQmlHandlerName, mapQmlHandler } from './event-mapper';
import { resolveLayout } from './layout-resolver';
import { UiDocument, UiNode, UiDiagnostic, createDiagnostic, SourceRange } from '../schema/ui-schema';

// Unsupported QML types that should generate clear diagnostics
const UNSUPPORTED_TYPES = new Set([
  // State system
  'State',
  'StateGroup',
  'PropertyChanges',
  'Transition',
  // Animations
  'Timeline',
  'KeyframeGroup',
  'Keyframe',
  'PropertyAnimation',
  'NumberAnimation',
  'ColorAnimation',
  'RotationAnimation',
  'Behavior',
  // Graphics and effects
  'SvgPathItem',
  'ShaderEffect',
  'FastBlur',
  'Glow',
  'InnerShadow',
  'DropShadow',
  'Canvas',
  // Path elements (limited support)
  'PathArc',
  'PathLine',
  'PathMove',
  'PathSvg',
  'PathText',
  'PathQuad',
  'PathCubic',
  // Advanced interaction
  'MultiPointTouchArea',
  'PinchArea',
  'DragHandler',
  'TapHandler',
  // Advanced layout
  'Positioner',
  // Model/View
  'ListView',
  'GridView',
  'PathView',
  'Repeater',
]);

function propertyMap(properties: QmlProperty[]): Map<string, QmlProperty> {
  return new Map(properties.map(p => [p.name, p]));
}

function propertyText(properties: QmlProperty[], name: string): string | undefined {
  const value = propertyMap(properties).get(name)?.value;
  if (!value) return undefined;
  if (value.kind === 'string') return JSON.stringify(value.value);
  if (value.kind === 'number') return String(value.value);
  if (value.kind === 'array') return '[]'; // Simplified
  if (value.kind === 'binding') return value.expression;
  return value.value;
}

function collectChildObjects(node: QmlObjectNode): QmlObjectNode[] {
  return [
    ...node.children,
    ...node.properties.flatMap(property => property.embeddedObject ? [property.embeddedObject] : [])
  ];
}

function children(nodes: QmlObjectNode[], diagnostics: UiDiagnostic[], filePath?: string): UiNode[] {
  return nodes.map(node => qmlNodeToUi(node, diagnostics, filePath));
}

function qmlValueToHandler(value: QmlProperty['value']): string {
  switch (value.kind) {
    case 'string':
    case 'identifier':
    case 'expression':
      return value.value;
    case 'number':
      return String(value.value);
    case 'array':
      return '[]';
    case 'binding':
      return value.expression;
  }
}

function handlersToEvents(handlers: QmlHandler[]) {
  return handlers.map(h => {
    const eventName = h.name.startsWith('on') ? h.name.slice(2) : h.name;
    const angularEvent = eventName.charAt(0).toLowerCase() + eventName.slice(1);
    return {
      name: h.name,
      angularEvent,
      handler: h.body
    };
  });
}

export function qmlNodeToUi(
  node: QmlObjectNode,
  diagnostics: UiDiagnostic[],
  filePath?: string
): UiNode {
  const props = propertyMap(node.properties);

  // Combine property-based handlers and explicit handlers
  const propertyHandlers = node.properties
    .filter(p => isQmlHandlerName(p.name))
    .map(p => mapQmlHandler(p.name, qmlValueToHandler(p.value)));

  const explicitHandlers = handlersToEvents(node.handlers);
  const events = [...propertyHandlers, ...explicitHandlers];

  const layout = resolveLayout(node.properties);

  // Check if this is an unsupported type
  if (UNSUPPORTED_TYPES.has(node.typeName)) {
    diagnostics.push(
      createDiagnostic(
        'warning',
        'unsupported',
        `QML type '${node.typeName}' is not supported in qml-ng v1.0. This element will be skipped or rendered as a placeholder.`,
        node.location,
        filePath,
        'UNSUPPORTED_TYPE'
      )
    );
  }

  switch (node.typeName) {
    case 'Window':
      return {
        kind: 'container',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { role: 'window' },
        location: node.location
      };

    case 'QtObject':
    case 'Component':
      return {
        kind: 'container',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { role: 'structural' },
        location: node.location
      };

    case 'Item':
    case 'Rectangle':
      return {
        kind: 'container',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { role: 'group' },
        location: node.location
      };

    case 'Column':
    case 'ColumnLayout':
      return {
        kind: 'container',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { orientation: 'column', layoutKind: node.typeName === 'ColumnLayout' ? 'column-layout' : 'column' },
        location: node.location
      };

    case 'Row':
    case 'RowLayout':
      return {
        kind: 'container',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { orientation: 'row', layoutKind: node.typeName === 'RowLayout' ? 'row-layout' : 'row' },
        location: node.location
      };

    case 'StackLayout':
      return {
        kind: 'container',
        name: 'StackLayout',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { layoutKind: 'stack' },
        location: node.location
      };

    case 'GridLayout':
      return {
        kind: 'container',
        name: 'GridLayout',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { layoutKind: 'grid' },
        location: node.location
      };

    case 'FlexboxLayout':
      return {
        kind: 'container',
        name: 'FlexboxLayout',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { layoutKind: 'flexbox' },
        location: node.location
      };

    case 'ScrollView':
      return {
        kind: 'container',
        name: 'ScrollView',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { role: 'scroll-view' },
        location: node.location
      };

    case 'ShapePath':
      diagnostics.push(
        createDiagnostic(
          'info',
          'unsupported',
          `ShapePath is partially supported. Complex path operations may not convert correctly.`,
          node.location,
          filePath,
          'PARTIAL_SUPPORT'
        )
      );
      return {
        kind: 'container',
        name: 'ShapePath',
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { role: 'shape-path' },
        location: node.location
      };

    case 'Text': {
      const raw = propertyText(node.properties, 'text') ?? '"TODO"';
      return {
        kind: 'text',
        name: 'Text',
        text: lowerBinding(raw).binding,
        layout,
        events,
        children: [],
        location: node.location
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
        children: [],
        location: node.location
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
        children: [],
        location: node.location
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
        meta: { ignored: true },
        location: node.location
      };

    case 'Button': {
      const raw = propertyText(node.properties, 'text') ?? '"Button"';
      return {
        kind: 'button',
        name: 'Button',
        text: lowerBinding(raw).binding,
        layout,
        events,
        children: [],
        location: node.location
      };
    }

    default:
      diagnostics.push(
        createDiagnostic(
          'warning',
          'semantic',
          `Unsupported QML type: ${node.typeName}. Converting as generic container.`,
          node.location,
          filePath,
          'UNKNOWN_TYPE'
        )
      );
      return {
        kind: 'unknown',
        name: node.typeName,
        layout,
        events,
        children: children(collectChildObjects(node), diagnostics, filePath),
        meta: { unsupported: true },
        location: node.location
      };
  }
}

export function qmlToUiDocument(name: string, qml: QmlDocument, filePath?: string): UiDocument {
  const diagnostics: UiDiagnostic[] = [];
  return {
    name,
    root: qmlNodeToUi(qml.root, diagnostics, filePath),
    diagnostics
  };
}
