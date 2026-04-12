import { UiNode, createDiagnostic } from '../schema/ui-schema';
import { LoweringPass, PassContext } from './pass-interface';

/**
 * Control Mapping Pass
 *
 * Responsibilities:
 * - Map QML control types to Angular Material equivalents
 * - Add control-specific metadata
 * - Flag unsupported control-specific features
 * - Add info diagnostics for partially supported controls
 *
 * This pass handles the final mapping of controls to their
 * Angular Material representations with appropriate metadata.
 */
export class ControlMappingPass implements LoweringPass {
  readonly name = 'control-mapping';

  transform(node: UiNode, context: PassContext): UiNode {
    // Add control-specific metadata and diagnostics
    let processedNode = { ...node };

    // Add specific metadata based on node kind and name
    processedNode = this.addControlMetadata(processedNode, context);

    return {
      ...processedNode
    };
  }

  /**
   * Adds control-specific metadata based on node type.
   */
  private addControlMetadata(node: UiNode, context: PassContext): UiNode {
    // ShapePath gets a partial support diagnostic
    if (node.name === 'ShapePath') {
      context.diagnostics.push(
        createDiagnostic(
          'info',
          'unsupported',
          `ShapePath is partially supported. Complex path operations may not convert correctly.`,
          node.location,
          context.filePath,
          'PARTIAL_SUPPORT'
        )
      );
    }

    // Animation/keyframe nodes get marked as ignored
    if (node.kind === 'animation') {
      return {
        ...node,
        meta: { ...node.meta, ignored: true }
      };
    }

    // Unknown nodes get unsupported flag
    if (node.kind === 'unknown') {
      return {
        ...node,
        meta: { ...node.meta, unsupported: true }
      };
    }

    return node;
  }

  /**
   * Gets Angular Material component mapping for a QML control.
   */
  static getAngularMapping(qmlType: string): string | undefined {
    const mappings: Record<string, string> = {
      'Button': 'mat-raised-button',
      'TextField': 'mat-form-field + mat-input',
      'Text': 'span or p',
      'Image': 'img',
      'Column': 'flex column',
      'Row': 'flex row',
      'ColumnLayout': 'flex column',
      'RowLayout': 'flex row'
    };
    return mappings[qmlType];
  }
}
