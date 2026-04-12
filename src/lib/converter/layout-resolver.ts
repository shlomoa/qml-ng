import { QmlProperty, QmlValue } from '../qml/ast';
import { hasAbsolutePositioning } from '../layout/layout-utils';
import { UiLayout, UiLayoutRule } from '../schema/ui-schema';

const LAYOUT_CONTAINER_RULES: Record<string, UiLayoutRule | undefined> = {
  Row: {
    source: 'Row',
    fidelity: 'exact',
    detail: 'Mapped to a flex row container.'
  },
  Column: {
    source: 'Column',
    fidelity: 'exact',
    detail: 'Mapped to a flex column container.'
  },
  RowLayout: {
    source: 'RowLayout',
    fidelity: 'approximate',
    detail: 'Mapped to a flex row container with best-effort sizing hints.'
  },
  ColumnLayout: {
    source: 'ColumnLayout',
    fidelity: 'approximate',
    detail: 'Mapped to a flex column container with best-effort sizing hints.'
  },
  StackLayout: {
    source: 'StackLayout',
    fidelity: 'approximate',
    detail: 'Mapped to a stacked container without full currentIndex semantics.'
  },
  GridLayout: {
    source: 'GridLayout',
    fidelity: 'approximate',
    detail: 'Mapped to CSS grid without full Qt layout constraints.'
  },
  FlexboxLayout: {
    source: 'FlexboxLayout',
    fidelity: 'approximate',
    detail: 'Mapped to CSS flexbox without full Qt layout constraints.'
  }
};

function qmlValueToText(value: QmlValue | undefined): string | undefined {
  if (!value) return undefined;

  switch (value.kind) {
    case 'string':
      return value.value;
    case 'number':
      return String(value.value);
    case 'identifier':
    case 'expression':
      return value.value;
    case 'binding':
      return value.expression;
    case 'array':
      return undefined;
  }
}

function pushRule(rules: UiLayoutRule[], source: string, fidelity: UiLayoutRule['fidelity'], detail: string): void {
  rules.push({ source, fidelity, detail });
}

function addAnchorRule(layout: UiLayout, rules: UiLayoutRule[], source: string, target: string | undefined): void {
  if (!target) return;

  if (source === 'anchors.fill') {
    if (target === 'parent') {
      layout.fillParent = true;
      pushRule(rules, source, 'exact', 'Mapped to CSS absolute fill within the parent container.');
      return;
    }

    pushRule(rules, source, 'unsupported', `Only parent fill is supported; found '${target}'.`);
    return;
  }

  if (source === 'anchors.centerIn') {
    if (target === 'parent') {
      layout.centerInParent = true;
      pushRule(rules, source, 'approximate', 'Mapped to CSS absolute centering with translate offsets.');
      return;
    }

    pushRule(rules, source, 'unsupported', `Only parent centering is supported; found '${target}'.`);
    return;
  }

  const parentTargets: Record<string, 'anchorLeftParent' | 'anchorRightParent' | 'anchorTopParent' | 'anchorBottomParent'> = {
    'anchors.left': 'anchorLeftParent',
    'anchors.right': 'anchorRightParent',
    'anchors.top': 'anchorTopParent',
    'anchors.bottom': 'anchorBottomParent'
  };

  const targetField = parentTargets[source];
  if (!targetField) {
    pushRule(rules, source, 'unsupported', `Anchor '${source}' is not supported.`);
    return;
  }

  const anchorDirection = anchorDirectionFromSource(source);
  const expectedTarget = anchorDirection ? `parent.${anchorDirection}` : undefined;
  if (expectedTarget && target === expectedTarget) {
    layout[targetField] = true;
    pushRule(rules, source, 'approximate', `Mapped to CSS ${anchorDirection}: 0 within the parent container.`);
    return;
  }

  pushRule(rules, source, 'unsupported', `Only parent edge alignment is supported; found '${target}'.`);
}

function anchorDirectionFromSource(source: string): 'left' | 'right' | 'top' | 'bottom' | undefined {
  switch (source) {
    case 'anchors.left':
      return 'left';
    case 'anchors.right':
      return 'right';
    case 'anchors.top':
      return 'top';
    case 'anchors.bottom':
      return 'bottom';
    default:
      return undefined;
  }
}

function addSizeRule(
  layout: UiLayout,
  rules: UiLayoutRule[],
  source: 'width' | 'height' | 'Layout.preferredWidth' | 'Layout.preferredHeight',
  value: string | undefined
): void {
  if (!value) return;

  if (source === 'width') {
    layout.width = value;
    pushRule(rules, source, /^\d+(\.\d+)?$/.test(value) ? 'exact' : 'approximate', 'Mapped to CSS width.');
    return;
  }

  if (source === 'height') {
    layout.height = value;
    pushRule(rules, source, /^\d+(\.\d+)?$/.test(value) ? 'exact' : 'approximate', 'Mapped to CSS height.');
    return;
  }

  if (source === 'Layout.preferredWidth') {
    layout.preferredWidth = value;
    pushRule(rules, source, 'approximate', 'Mapped to a best-effort CSS width hint.');
    return;
  }

  layout.preferredHeight = value;
  pushRule(rules, source, 'approximate', 'Mapped to a best-effort CSS height hint.');
}

function addLayoutPropertyRule(rules: UiLayoutRule[], property: QmlProperty): void {
  if (property.name === 'Layout.preferredWidth' || property.name === 'Layout.preferredHeight') {
    return;
  }

  pushRule(
    rules,
    property.name,
    'unsupported',
    `QtQuick.Layouts property '${property.name}' is not supported yet.`
  );
}

function toCssLength(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}px`;
  }

  return trimmed;
}

export function resolveLayout(typeName: string, properties: QmlProperty[]): UiLayout | undefined {
  const map = new Map(properties.map(property => [property.name, property]));
  const rules: UiLayoutRule[] = [];
  const layout: UiLayout = {};

  const containerRule = LAYOUT_CONTAINER_RULES[typeName];
  if (containerRule) {
    rules.push(containerRule);
  }

  addAnchorRule(layout, rules, 'anchors.fill', qmlValueToText(map.get('anchors.fill')?.value));
  addAnchorRule(layout, rules, 'anchors.centerIn', qmlValueToText(map.get('anchors.centerIn')?.value));
  addAnchorRule(layout, rules, 'anchors.left', qmlValueToText(map.get('anchors.left')?.value));
  addAnchorRule(layout, rules, 'anchors.right', qmlValueToText(map.get('anchors.right')?.value));
  addAnchorRule(layout, rules, 'anchors.top', qmlValueToText(map.get('anchors.top')?.value));
  addAnchorRule(layout, rules, 'anchors.bottom', qmlValueToText(map.get('anchors.bottom')?.value));

  const x = qmlValueToText(map.get('x')?.value);
  const y = qmlValueToText(map.get('y')?.value);
  if (x) {
    layout.absoluteX = x;
    pushRule(rules, 'x', 'approximate', 'Mapped to CSS left with absolute positioning.');
  }
  if (y) {
    layout.absoluteY = y;
    pushRule(rules, 'y', 'approximate', 'Mapped to CSS top with absolute positioning.');
  }

  addSizeRule(layout, rules, 'width', qmlValueToText(map.get('width')?.value));
  addSizeRule(layout, rules, 'height', qmlValueToText(map.get('height')?.value));
  addSizeRule(layout, rules, 'Layout.preferredWidth', qmlValueToText(map.get('Layout.preferredWidth')?.value));
  addSizeRule(layout, rules, 'Layout.preferredHeight', qmlValueToText(map.get('Layout.preferredHeight')?.value));

  properties
    .filter(property => property.name.startsWith('Layout.'))
    .forEach(property => addLayoutPropertyRule(rules, property));

  if (rules.length > 0) {
    layout.rules = rules;
  }

  return Object.keys(layout).length ? layout : undefined;
}

export function layoutToCssDeclarations(layout: UiLayout | undefined): string[] {
  if (!layout) return [];

  const declarations: string[] = [];
  if (hasAbsolutePositioning(layout)) {
    declarations.push('position: absolute;');
  }

  if (layout.fillParent) {
    declarations.push('inset: 0;');
  } else {
    if (layout.centerInParent) {
      declarations.push('left: 50%;', 'top: 50%;', 'transform: translate(-50%, -50%);');
    }

    if (layout.anchorLeftParent) {
      declarations.push('left: 0;');
    } else if (layout.absoluteX) {
      declarations.push(`left: ${toCssLength(layout.absoluteX)};`);
    }

    if (layout.anchorRightParent) {
      declarations.push('right: 0;');
    }

    if (layout.anchorTopParent) {
      declarations.push('top: 0;');
    } else if (layout.absoluteY) {
      declarations.push(`top: ${toCssLength(layout.absoluteY)};`);
    }

    if (layout.anchorBottomParent) {
      declarations.push('bottom: 0;');
    }
  }

  if (layout.width) {
    declarations.push(`width: ${toCssLength(layout.width)};`);
  } else if (layout.preferredWidth) {
    declarations.push(`width: ${toCssLength(layout.preferredWidth)};`);
  }

  if (layout.height) {
    declarations.push(`height: ${toCssLength(layout.height)};`);
  } else if (layout.preferredHeight) {
    declarations.push(`height: ${toCssLength(layout.preferredHeight)};`);
  }

  return declarations;
}

export function layoutToScss(layout: UiLayout | undefined): string {
  return layoutToCssDeclarations(layout).join('\n');
}
