import { QmlDocument, QmlObjectNode, QmlProperty, QmlHandler } from '../qml/ast';
import { UiDocument, UiNode, UiDiagnostic, createDiagnostic, SourceRange } from '../schema/ui-schema';
import {
  PassContext,
  PassPipeline,
  StructuralNormalizationPass,
  BindingLoweringPass,
  HandlerLoweringPass,
  LayoutLoweringPass,
  ControlMappingPass,
  DiagnosticsEnrichmentPass
} from '../passes';
import { resolveLayout } from './layout-resolver';

/**
 * Legacy function for backward compatibility.
 * Use BindingLoweringPass.lowerBinding instead.
 */
export function lowerBinding(raw: string | number | boolean) {
  return BindingLoweringPass.lowerBinding(raw);
}

/**
 * Legacy function for backward compatibility.
 * Use HandlerLoweringPass.isQmlHandlerName instead.
 */
export function isQmlHandlerName(name: string): boolean {
  return HandlerLoweringPass.isQmlHandlerName(name);
}

/**
 * Legacy function for backward compatibility.
 * Use HandlerLoweringPass.mapQmlHandler instead.
 */
export function mapQmlHandler(name: string, handler: string) {
  return HandlerLoweringPass.mapQmlHandler(name, handler);
}

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

/**
 * Converts a QML object node to a UiNode using the multi-pass architecture.
 *
 * The conversion process:
 * 1. Build initial UiNode structure from QML AST
 * 2. Run through semantic lowering passes
 * 3. Return fully processed UiNode
 */
export function qmlNodeToUi(
  node: QmlObjectNode,
  diagnostics: UiDiagnostic[],
  filePath?: string
): UiNode {
  const props = propertyMap(node.properties);

  // Combine property-based handlers and explicit handlers
  const propertyHandlers = node.properties
    .filter(p => HandlerLoweringPass.isQmlHandlerName(p.name))
    .map(p => HandlerLoweringPass.mapQmlHandler(p.name, qmlValueToHandler(p.value)));

  const explicitHandlers = handlersToEvents(node.handlers);
  const events = [...propertyHandlers, ...explicitHandlers];

  const layout = resolveLayout(node.properties);

  // Build initial UiNode based on QML type
  const initialNode = buildInitialNode(node, layout, events, diagnostics, filePath);

  // Create pass context
  const context: PassContext = {
    diagnostics,
    filePath
  };

  // Create and execute the lowering pipeline
  const pipeline = new PassPipeline()
    .add(new StructuralNormalizationPass())
    .add(new BindingLoweringPass())
    .add(new HandlerLoweringPass())
    .add(new LayoutLoweringPass())
    .add(new ControlMappingPass())
    .add(new DiagnosticsEnrichmentPass());

  return pipeline.execute(initialNode, context);
}

/**
 * Builds the initial UiNode structure from QML AST before passes.
 */
function buildInitialNode(
  node: QmlObjectNode,
  layout: any,
  events: any[],
  diagnostics: UiDiagnostic[],
  filePath?: string
): UiNode {
  const kind = StructuralNormalizationPass.classifyNodeKind(node.typeName);
  const childNodes = children(collectChildObjects(node), diagnostics, filePath);

  // Common properties for all nodes
  const baseNode = {
    kind,
    name: node.typeName,
    layout,
    events,
    children: childNodes,
    location: node.location
  };

  // Add type-specific properties
  switch (node.typeName) {
    case 'Window':
    case 'QtObject':
    case 'Component':
    case 'Item':
    case 'Rectangle':
    case 'Column':
    case 'ColumnLayout':
    case 'Row':
    case 'RowLayout':
    case 'StackLayout':
    case 'GridLayout':
    case 'FlexboxLayout':
    case 'ScrollView':
    case 'ShapePath':
      return {
        ...baseNode,
        meta: StructuralNormalizationPass.classifyContainerMeta(node.typeName)
      };

    case 'Text': {
      const raw = propertyText(node.properties, 'text') ?? '"TODO"';
      return {
        ...baseNode,
        text: lowerBinding(raw).binding,
        children: []
      };
    }

    case 'Image': {
      const raw = propertyText(node.properties, 'source') ?? '""';
      return {
        ...baseNode,
        source: lowerBinding(raw).binding,
        children: []
      };
    }

    case 'TextField': {
      const raw = propertyText(node.properties, 'placeholderText') ?? '""';
      return {
        ...baseNode,
        placeholder: lowerBinding(raw).binding,
        children: []
      };
    }

    case 'Button': {
      const raw = propertyText(node.properties, 'text') ?? '"Button"';
      return {
        ...baseNode,
        text: lowerBinding(raw).binding,
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
        ...baseNode,
        children: [],
        meta: { ignored: true }
      };

    default:
      return {
        ...baseNode,
        meta: { unsupported: true }
      };
  }
}

/**
 * Converts a QML document to a UiDocument.
 */
export function qmlToUiDocument(name: string, qml: QmlDocument, filePath?: string): UiDocument {
  const diagnostics: UiDiagnostic[] = [];
  return {
    name,
    root: qmlNodeToUi(qml.root, diagnostics, filePath),
    diagnostics
  };
}
