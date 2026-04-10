import { ImportsResolver, RenderContext } from './renderer-contract';
import { UiNode } from '../schema/ui-schema';

/**
 * Mapping of Material module names to their npm package paths
 */
const MATERIAL_IMPORT_MAP: Record<string, string> = {
  MatButtonModule: '@angular/material/button',
  MatFormFieldModule: '@angular/material/form-field',
  MatInputModule: '@angular/material/input',
  MatCheckboxModule: '@angular/material/checkbox',
  MatCardModule: '@angular/material/card',
  MatToolbarModule: '@angular/material/toolbar',
  MatSidenavModule: '@angular/material/sidenav',
  MatListModule: '@angular/material/list',
  MatIconModule: '@angular/material/icon',
  MatMenuModule: '@angular/material/menu',
  MatTableModule: '@angular/material/table',
  MatPaginatorModule: '@angular/material/paginator',
  MatSortModule: '@angular/material/sort',
  MatDialogModule: '@angular/material/dialog',
  MatSnackBarModule: '@angular/material/snack-bar',
  MatProgressSpinnerModule: '@angular/material/progress-spinner',
  MatProgressBarModule: '@angular/material/progress-bar',
  MatTabsModule: '@angular/material/tabs',
  MatSelectModule: '@angular/material/select',
  MatSlideToggleModule: '@angular/material/slide-toggle',
  MatRadioModule: '@angular/material/radio',
  MatDatepickerModule: '@angular/material/datepicker',
  MatTooltipModule: '@angular/material/tooltip',
  MatExpansionModule: '@angular/material/expansion',
  MatChipsModule: '@angular/material/chips',
  MatBadgeModule: '@angular/material/badge',
  MatStepperModule: '@angular/material/stepper',
  MatSliderModule: '@angular/material/slider',
  MatGridListModule: '@angular/material/grid-list',
  MatAutocompleteModule: '@angular/material/autocomplete',
  MatButtonToggleModule: '@angular/material/button-toggle',
  MatRippleModule: '@angular/material/core',
};

/**
 * Default implementation of imports resolver for Angular and Material
 */
export class DefaultImportsResolver implements ImportsResolver {
  collectAngularImports(ctx: RenderContext): string[] {
    const imports = new Set<string>(['Component']);

    // Add computed if we have any computed declarations
    if (ctx.computedDeclarations.length > 0) {
      imports.add('computed');
    }

    // Add signal if we have any signal declarations
    if (ctx.signalDeclarations.length > 0 || ctx.dependencyNames.size > 0) {
      imports.add('signal');
    }

    return [...imports].sort();
  }

  collectMaterialImports(root: UiNode): string[] {
    const imports = new Set<string>();

    const walk = (node: UiNode): void => {
      switch (node.kind) {
        case 'button':
          imports.add('MatButtonModule');
          break;
        case 'input':
          imports.add('MatFormFieldModule');
          imports.add('MatInputModule');
          break;
        case 'image':
          // Images don't require Material modules
          break;
        case 'text':
          // Text doesn't require Material modules
          break;
        case 'container':
          // Containers might need modules based on meta
          if (node.meta?.card) {
            imports.add('MatCardModule');
          }
          if (node.meta?.toolbar) {
            imports.add('MatToolbarModule');
          }
          break;
      }
      node.children.forEach(walk);
    };

    walk(root);
    return [...imports].sort();
  }

  renderImports(angularImports: string[], materialImports: string[]): string {
    const lines: string[] = [];

    // Angular core imports
    if (angularImports.length > 0) {
      lines.push(`import { ${angularImports.join(', ')} } from '@angular/core';`);
    }

    // Material imports - grouped by package
    const groupedImports = new Map<string, string[]>();
    for (const module of materialImports) {
      const packagePath = MATERIAL_IMPORT_MAP[module];
      if (packagePath) {
        if (!groupedImports.has(packagePath)) {
          groupedImports.set(packagePath, []);
        }
        groupedImports.get(packagePath)!.push(module);
      }
    }

    // Sort packages and emit imports
    const sortedPackages = [...groupedImports.keys()].sort();
    for (const packagePath of sortedPackages) {
      const modules = groupedImports.get(packagePath)!.sort();
      lines.push(`import { ${modules.join(', ')} } from '${packagePath}';`);
    }

    return lines.join('\n');
  }
}
