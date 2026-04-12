import { QmlDocument, QmlObjectNode, QmlProperty, QmlHandler, QmlImport } from '../qml/ast';
import { UiDocument, UiNode, UiDiagnostic, UiStateDeclaration, createDiagnostic, SourceRange } from '../schema/ui-schema';
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
import { lowerBinding as lowerBindingAst } from './expression-lowering';

/**
 * Legacy function for backward compatibility.
 * Delegates to the AST-based expression lowering.
 */
export function lowerBinding(raw: string | number | boolean) {
  return lowerBindingAst(raw);
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

/**
 * Maps a QML primitive type name to the corresponding TypeScript type.
 * Used for generating typed signal declarations like `signal<number>(0)`.
 */
function qmlTypeToTs(qmlType: string): string {
  switch (qmlType) {
    case 'int':
    case 'real':
    case 'double':
    case 'float':
      return 'number';
    case 'string':
    case 'url':
    case 'color':
      return 'string';
    case 'bool':
      return 'boolean';
    default:
      return 'any';
  }
}

/**
 * Converts a QmlValue to a TypeScript/Angular initial value expression string.
 * For identifier values (property references), the value is lowered as an
 * expression so that signal reads are written correctly (e.g. `otherProp()`).
 */
function qmlValueToInitializer(value: QmlProperty['value']): string {
  switch (value.kind) {
    case 'string':
      return JSON.stringify(value.value);
    case 'number':
      return String(value.value);
    case 'identifier':
      if (value.value === 'true' || value.value === 'false') {
        return value.value;
      }
      // Treat bare identifier as an expression — the lowering will rewrite it as
      // a signal read (e.g. `otherProp()`), which is the correct QML semantics.
      return lowerBindingAst(value.value).angularExpression;
    case 'expression':
    case 'binding':
      return lowerBindingAst(value.kind === 'binding' ? value.expression : value.value).angularExpression;
    case 'array':
      return '[]';
  }
}

/**
 * Extracts typed QML property declarations (e.g. `property int count: 0`) as
 * UiStateDeclaration objects that the renderer will emit as `signal<T>(value)`.
 *
 * Simple handler-like properties (onFoo) and well-known visual properties are
 * excluded because they are handled by other parts of the pipeline.
 */
function extractStateDeclarations(properties: QmlProperty[]): UiStateDeclaration[] {
  const declarations: UiStateDeclaration[] = [];
  for (const prop of properties) {
    if (prop.propertyKind !== 'typed' && prop.propertyKind !== 'readonly') {
      continue;
    }
    // Skip handler-like names and embedded-object properties
    if (prop.name.startsWith('on') || prop.embeddedObject) {
      continue;
    }
    // Skip complex / unsupported type references.
    // QML primitive types ('int', 'real', 'string', 'bool', 'url', 'color', 'var') are
    // all lowercase; component/object types (e.g. 'Window', 'MyButton') start with an
    // uppercase letter and require full component-resolution support which is out of scope
    // for v1.0 signal lowering.  Using the capitalisation convention is a reliable
    // heuristic for all standard QML types; any unusual custom types that are lowercase
    // will fall through to 'any'.
    const typeName = prop.typeName ?? '';
    if (typeName && /^[A-Z]/.test(typeName)) {
      continue;
    }
    declarations.push({
      name: prop.name,
      tsType: qmlTypeToTs(typeName),
      initialValue: qmlValueToInitializer(prop.value),
      isReadonly: prop.propertyKind === 'readonly',
      location: prop.location
    });
  }
  return declarations;
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
      handler: h.body,
      location: h.location
    };
  });
}

function collectLayoutTypeNames(node: QmlObjectNode, types = new Set<string>()): Set<string> {
  if (['RowLayout', 'ColumnLayout', 'StackLayout', 'GridLayout', 'FlexboxLayout'].includes(node.typeName)) {
    types.add(node.typeName);
  }

  node.children.forEach(child => collectLayoutTypeNames(child, types));
  node.properties.forEach(property => {
    if (property.embeddedObject) {
      collectLayoutTypeNames(property.embeddedObject, types);
    }
  });

  return types;
}

function diagnoseQtQuickLayoutsImport(
  imports: QmlImport[],
  root: QmlObjectNode,
  diagnostics: UiDiagnostic[],
  filePath?: string
): void {
  if (!imports.some(entry => entry.module === 'QtQuick.Layouts')) {
    return;
  }

  const layoutTypes = Array.from(collectLayoutTypeNames(root)).sort((a, b) => a.localeCompare(b));
  if (layoutTypes.length === 0) {
    diagnostics.push(
      createDiagnostic(
        'info',
        'semantic',
        'QtQuick.Layouts import detected. qml-ng will diagnose layout-only properties conservatively and avoid promising exact Qt fidelity.',
        root.location,
        filePath,
        'QTQUICK_LAYOUTS_IMPORT'
      )
    );
    return;
  }

  diagnostics.push(
    createDiagnostic(
      'info',
      'semantic',
      `QtQuick.Layouts types ${layoutTypes.join(', ')} are lowered approximately; qml-ng preserves flow intent and emits diagnostics for unsupported constraints.`,
      root.location,
      filePath,
      'QTQUICK_LAYOUTS_APPROXIMATE'
    )
  );
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
    .map(p => HandlerLoweringPass.mapQmlHandler(p.name, qmlValueToHandler(p.value), p.location));

  const explicitHandlers = handlersToEvents(node.handlers);
  const events = [...propertyHandlers, ...explicitHandlers];

  const layout = resolveLayout(node.typeName, node.properties);

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

  // Extract typed property declarations (e.g. `property int count: 0`)
  const stateDeclarations = extractStateDeclarations(node.properties);

  // Common properties for all nodes
  const baseNode: UiNode = {
    kind,
    name: node.typeName,
    layout,
    events,
    children: childNodes,
    location: node.location,
    ...(stateDeclarations.length > 0 ? { stateDeclarations } : {})
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
  diagnoseQtQuickLayoutsImport(qml.imports, qml.root, diagnostics, filePath);
  return {
    name,
    root: qmlNodeToUi(qml.root, diagnostics, filePath),
    diagnostics
  };
}
