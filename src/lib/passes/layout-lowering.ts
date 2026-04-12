import { UiNode, UiLayout } from '../schema/ui-schema';
import { LoweringPass, PassContext } from './pass-interface';

/**
 * Layout Lowering Pass
 *
 * Responsibilities:
 * - Process anchor properties (anchors.fill, anchors.centerIn)
 * - Convert QML layout properties to UiLayout structure
 * - Handle fillParent and centerInParent patterns
 *
 * This pass ensures all layout information is properly structured
 * in the UiLayout interface for consistent rendering.
 */
export class LayoutLoweringPass implements LoweringPass {
  readonly name = 'layout-lowering';

  transform(node: UiNode, context: PassContext): UiNode {
    // Layout is already resolved during initial conversion,
    // but this pass can enrich or validate it
    const processedLayout = this.ensureProperLayout(node.layout);

    return {
      ...node,
      layout: processedLayout
    };
  }

  /**
   * Ensures layout is properly structured.
   * Can add validation or normalization here.
   */
  private ensureProperLayout(layout: UiLayout | undefined): UiLayout | undefined {
    if (!layout || Object.keys(layout).length === 0) {
      return undefined;
    }
    return layout;
  }

  /**
   * Converts UiLayout to SCSS rules.
   */
  static layoutToScss(layout: UiLayout | undefined): string {
    if (!layout) return '';

    const rules: string[] = [];
    if (layout.fillParent) {
      rules.push('width: 100%;', 'height: 100%;');
    }
    if (layout.centerInParent) {
      rules.push('display: flex;', 'justify-content: center;', 'align-items: center;');
    }
    return rules.join('\n');
  }
}
