import { UiNode, createDiagnostic } from '../schema/ui-schema';
import { LoweringPass, PassContext } from './pass-interface';

/**
 * Structural Normalization Pass
 *
 * Responsibilities:
 * - Classify QML types into UiNode kinds (container, text, input, button, etc.)
 * - Set up basic node structure with name and kind
 * - Initialize empty children arrays
 * - Detect and flag unsupported QML types
 * - Preserve source location information
 *
 * This pass does NOT:
 * - Process bindings or expressions
 * - Handle events or handlers
 * - Resolve layout properties
 * - Map specific control properties
 */
export class StructuralNormalizationPass implements LoweringPass {
  readonly name = 'structural-normalization';

  // Unsupported QML types that should generate clear diagnostics
  private static readonly UNSUPPORTED_TYPES = new Set([
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

  transform(node: UiNode, context: PassContext): UiNode {
    // Check if this is an unsupported type
    if (node.name && StructuralNormalizationPass.UNSUPPORTED_TYPES.has(node.name)) {
      context.diagnostics.push(
        createDiagnostic(
          'warning',
          'unsupported',
          `QML type '${node.name}' is not supported in qml-ng v1.0. This element will be skipped or rendered as a placeholder.`,
          node.location,
          context.filePath,
          'UNSUPPORTED_TYPE'
        )
      );
    }

    // Recursively process children
    const processedChildren = node.children.map(child => this.transform(child, context));

    return {
      ...node,
      children: processedChildren
    };
  }

  /**
   * Determines the appropriate UiNode kind based on QML type name.
   */
  static classifyNodeKind(typeName: string): UiNode['kind'] {
    switch (typeName) {
      case 'Text':
        return 'text';
      case 'TextField':
        return 'input';
      case 'Button':
        return 'button';
      case 'Image':
        return 'image';
      case 'KeyframeGroup':
      case 'PathArc':
      case 'PathLine':
      case 'PathMove':
      case 'PathSvg':
      case 'PathText':
        return 'animation';
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
        return 'container';
      default:
        return 'unknown';
    }
  }

  /**
   * Determines metadata for container nodes.
   */
  static classifyContainerMeta(typeName: string): Record<string, unknown> {
    switch (typeName) {
      case 'Window':
        return { role: 'window' };
      case 'QtObject':
      case 'Component':
        return { role: 'structural' };
      case 'Item':
      case 'Rectangle':
        return { role: 'group' };
      case 'Column':
      case 'ColumnLayout':
        return {
          orientation: 'column',
          layoutKind: typeName === 'ColumnLayout' ? 'column-layout' : 'column'
        };
      case 'Row':
      case 'RowLayout':
        return {
          orientation: 'row',
          layoutKind: typeName === 'RowLayout' ? 'row-layout' : 'row'
        };
      case 'StackLayout':
        return { layoutKind: 'stack' };
      case 'GridLayout':
        return { layoutKind: 'grid' };
      case 'FlexboxLayout':
        return { layoutKind: 'flexbox' };
      case 'ScrollView':
        return { role: 'scroll-view' };
      case 'ShapePath':
        return { role: 'shape-path' };
      default:
        return {};
    }
  }
}
