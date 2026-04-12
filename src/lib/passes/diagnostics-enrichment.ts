import { UiNode, createDiagnostic } from '../schema/ui-schema';
import { LoweringPass, PassContext } from './pass-interface';

/**
 * Diagnostics Enrichment Pass
 *
 * Responsibilities:
 * - Add warnings for unknown types not caught by earlier passes
 * - Validate node structure and flag inconsistencies
 * - Add helpful info messages for edge cases
 * - Collect and aggregate diagnostic information
 *
 * This is the final pass that can add cross-cutting diagnostics
 * based on the complete lowered structure.
 */
export class DiagnosticsEnrichmentPass implements LoweringPass {
  readonly name = 'diagnostics-enrichment';

  transform(node: UiNode, context: PassContext): UiNode {
    // Check for unknown types that weren't caught earlier
    if (node.kind === 'unknown' && node.name) {
      // Only add diagnostic if not already added
      const alreadyDiagnosed = context.diagnostics.some(
        d => d.code === 'UNKNOWN_TYPE' && d.location === node.location
      );

      if (!alreadyDiagnosed) {
        context.diagnostics.push(
          createDiagnostic(
            'warning',
            'semantic',
            `Unsupported QML type: ${node.name}. Converting as generic container.`,
            node.location,
            context.filePath,
            'UNKNOWN_TYPE'
          )
        );
      }
    }

    // Check for nodes with no children that should have them
    if (node.kind === 'container' && node.children.length === 0) {
      // This is informational only - empty containers are valid
      // but might indicate a mistake
    }

    return {
      ...node
    };
  }

  /**
   * Validates that a node has required properties based on its kind.
   */
  static validateNode(node: UiNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Text nodes should have text binding
    if (node.kind === 'text' && !node.text) {
      errors.push('Text node missing text binding');
    }

    // Input nodes should have placeholder (optional but recommended)
    // Button nodes should have text (optional but recommended)
    // Image nodes should have source
    if (node.kind === 'image' && !node.source) {
      errors.push('Image node missing source binding');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
