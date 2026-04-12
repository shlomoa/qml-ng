import { UiLayout, UiNode } from '../schema/ui-schema';

export function isFlowLayoutContainer(node: UiNode | undefined): boolean {
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

export function hasAbsolutePositioning(layout: UiLayout | undefined): boolean {
  if (!layout) return false;

  return Boolean(
    layout.fillParent ||
    layout.centerInParent ||
    layout.anchorLeftParent ||
    layout.anchorRightParent ||
    layout.anchorTopParent ||
    layout.anchorBottomParent ||
    layout.absoluteX ||
    layout.absoluteY
  );
}

export function hasHorizontalAbsoluteConflict(layout: UiLayout): boolean {
  return Boolean(layout.fillParent || layout.centerInParent || layout.anchorLeftParent || layout.anchorRightParent);
}

export function hasVerticalAbsoluteConflict(layout: UiLayout): boolean {
  return Boolean(layout.fillParent || layout.centerInParent || layout.anchorTopParent || layout.anchorBottomParent);
}

export function suppressAbsolutePositioning(layout: UiLayout): UiLayout {
  return {
    ...layout,
    fillParent: false,
    centerInParent: false,
    anchorLeftParent: false,
    anchorRightParent: false,
    anchorTopParent: false,
    anchorBottomParent: false,
    absoluteX: undefined,
    absoluteY: undefined
  };
}
