import { UiLayout, UiNode, createDiagnostic } from '../schema/ui-schema';
import { LoweringPass, PassContext } from './pass-interface';

function isFlowLayoutContainer(node: UiNode | undefined): boolean {
  if (!node) return false;

  return Boolean(
    node.meta?.orientation === 'row' ||
    node.meta?.orientation === 'column' ||
    node.meta?.layoutKind === 'row-layout' ||
    node.meta?.layoutKind === 'column-layout' ||
    node.meta?.layoutKind === 'stack' ||
    node.meta?.layoutKind === 'grid' ||
    node.meta?.layoutKind === 'flexbox'
  );
}

function hasHorizontalAbsoluteConflict(layout: UiLayout): boolean {
  return Boolean(layout.fillParent || layout.centerInParent || layout.anchorLeftParent || layout.anchorRightParent);
}

function hasVerticalAbsoluteConflict(layout: UiLayout): boolean {
  return Boolean(layout.fillParent || layout.centerInParent || layout.anchorTopParent || layout.anchorBottomParent);
}

/**
 * Layout Lowering Pass
 *
 * Responsibilities:
 * - Normalize layout metadata captured during initial conversion
 * - Surface rule fidelity diagnostics for exact/approximate/unsupported mappings
 * - Detect precedence conflicts between anchors, x/y, and flow layout containers
 */
export class LayoutLoweringPass implements LoweringPass {
  readonly name = 'layout-lowering';

  transform(node: UiNode, context: PassContext): UiNode {
    return this.transformNode(node, context, undefined);
  }

  private transformNode(node: UiNode, context: PassContext, parent: UiNode | undefined): UiNode {
    const layout = this.ensureProperLayout(node.layout);

    if (layout?.rules?.length) {
      this.emitLayoutRuleDiagnostics(node, layout, context);
      this.emitConflictDiagnostics(node, layout, context, parent);
    }

    const processedNode: UiNode = {
      ...node,
      layout
    };

    const processedChildren = node.children.map(child => this.transformNode(child, context, processedNode));

    return {
      ...processedNode,
      children: processedChildren
    };
  }

  private emitLayoutRuleDiagnostics(node: UiNode, layout: UiLayout, context: PassContext): void {
    for (const rule of layout.rules ?? []) {
      context.diagnostics.push(
        createDiagnostic(
          rule.fidelity === 'unsupported' ? 'warning' : 'info',
          rule.fidelity === 'unsupported' ? 'unsupported' : 'semantic',
          `[${rule.fidelity}] ${rule.source}: ${rule.detail}`,
          node.location,
          context.filePath,
          `LAYOUT_RULE_${rule.fidelity.toUpperCase()}`
        )
      );
    }
  }

  private emitConflictDiagnostics(
    node: UiNode,
    layout: UiLayout,
    context: PassContext,
    parent: UiNode | undefined
  ): void {
    if (layout.absoluteX && hasHorizontalAbsoluteConflict(layout)) {
      context.diagnostics.push(
        createDiagnostic(
          'warning',
          'semantic',
          'Horizontal anchors take precedence over x placement; qml-ng keeps the anchor mapping and ignores x for CSS emission.',
          node.location,
          context.filePath,
          'LAYOUT_CONFLICT_HORIZONTAL'
        )
      );
    }

    if (layout.absoluteY && hasVerticalAbsoluteConflict(layout)) {
      context.diagnostics.push(
        createDiagnostic(
          'warning',
          'semantic',
          'Vertical anchors take precedence over y placement; qml-ng keeps the anchor mapping and ignores y for CSS emission.',
          node.location,
          context.filePath,
          'LAYOUT_CONFLICT_VERTICAL'
        )
      );
    }

    if (isFlowLayoutContainer(parent) && (
      layout.fillParent ||
      layout.centerInParent ||
      layout.anchorLeftParent ||
      layout.anchorRightParent ||
      layout.anchorTopParent ||
      layout.anchorBottomParent ||
      layout.absoluteX ||
      layout.absoluteY
    )) {
      context.diagnostics.push(
        createDiagnostic(
          'warning',
          'semantic',
          `Parent layout container '${parent?.name ?? 'unknown'}' takes precedence over child anchors/x/y; qml-ng suppresses absolute positioning for this child and keeps only size hints.`,
          node.location,
          context.filePath,
          'LAYOUT_CONTAINER_CONFLICT'
        )
      );
    }
  }

  private ensureProperLayout(layout: UiLayout | undefined): UiLayout | undefined {
    if (!layout || Object.keys(layout).length === 0) {
      return undefined;
    }
    return layout;
  }
}
