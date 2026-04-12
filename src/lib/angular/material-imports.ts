import { UiNode } from '../schema/ui-schema';
import { collectComponentImportsFromRegistry } from './node-render-registry';

export function collectComponentImports(node: UiNode): string[] {
  return collectComponentImportsFromRegistry(node);
}

export function collectMaterialImports(node: UiNode): string[] {
  return collectComponentImports(node);
}
