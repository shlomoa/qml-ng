import { UiNode } from '../schema/ui-schema';
import { collectMaterialImports } from './material-imports';
import { ImportsResolver } from './renderer-contract';

const ANGULAR_MATERIAL_IMPORT_MAP: Record<string, string> = {
  MatButtonModule: '@angular/material/button',
  MatFormFieldModule: '@angular/material/form-field',
  MatInputModule: '@angular/material/input'
};

export class MaterialImportsResolver implements ImportsResolver {
  collectComponentImports(root: UiNode): string[] {
    return collectMaterialImports(root);
  }

  renderImportStatements(imports: string[]): string[] {
    return imports
      .map(name => {
        const modulePath = ANGULAR_MATERIAL_IMPORT_MAP[name];
        return modulePath ? `import { ${name} } from '${modulePath}';` : '';
      })
      .filter(Boolean);
  }
}
