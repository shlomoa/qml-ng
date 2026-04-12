import { UiNode } from '../schema/ui-schema';
import { collectComponentImports } from './material-imports';
import { ImportsResolver } from './renderer-contract';

const COMPONENT_IMPORT_MAP: Record<string, string> = {
  CommonModule: '@angular/common',
  MatButtonModule: '@angular/material/button',
  MatFormFieldModule: '@angular/material/form-field',
  MatInputModule: '@angular/material/input'
};

export class MaterialImportsResolver implements ImportsResolver {
  collectComponentImports(root: UiNode): string[] {
    return collectComponentImports(root);
  }

  renderImportStatements(imports: string[]): string[] {
    return imports
      .map(name => {
        const modulePath = COMPONENT_IMPORT_MAP[name];
        return modulePath ? `import { ${name} } from '${modulePath}';` : '';
      })
      .filter(Boolean);
  }
}
