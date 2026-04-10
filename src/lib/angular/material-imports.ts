import { UiNode } from '../schema/ui-schema';

export function collectMaterialImports(node: UiNode): string[] {
  const imports = new Set<string>();

  function walk(current: UiNode): void {
    switch (current.kind) {
      case 'button':
        imports.add('MatButtonModule');
        break;
      case 'input':
        imports.add('MatFormFieldModule');
        imports.add('MatInputModule');
        break;
    }
    current.children.forEach(walk);
  }

  walk(node);
  return [...imports].sort();
}
