import { QmlProperty } from '../qml/ast';
import { UiLayout } from '../schema/ui-schema';

export function resolveLayout(properties: QmlProperty[]): UiLayout | undefined {
  const map = new Map(properties.map(p => [p.name, p.value]));
  const fill = map.get('anchors.fill');
  const center = map.get('anchors.centerIn');

  const layout: UiLayout = {};

  if (fill && fill.kind === 'identifier' && fill.value === 'parent') {
    layout.fillParent = true;
  }

  if (center && center.kind === 'identifier' && center.value === 'parent') {
    layout.centerInParent = true;
  }

  return Object.keys(layout).length ? layout : undefined;
}

export function layoutToScss(layout: UiLayout | undefined): string {
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
