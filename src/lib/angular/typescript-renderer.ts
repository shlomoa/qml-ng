import { TypeScriptRenderer, RenderContext } from './renderer-contract';
import { UiDocument } from '../schema/ui-schema';
import { DefaultDiagnosticsEmitter } from './diagnostics-emitter';
import { DefaultNamingService } from './naming-service';

/**
 * Default implementation of TypeScript component class renderer
 * Generates standalone Angular component with signals and computed properties
 */
export class DefaultTypeScriptRenderer implements TypeScriptRenderer {
  private diagnostics = new DefaultDiagnosticsEmitter();
  private naming = new DefaultNamingService();

  render(doc: UiDocument, ctx: RenderContext, materialImports: string[]): string {
    const lines: string[] = [];

    // Render diagnostics as comments at the top
    const diagnosticsBlock = this.diagnostics.renderDiagnostics(ctx);
    if (diagnosticsBlock) {
      lines.push(diagnosticsBlock);
      lines.push('');
    }

    // Render @Component decorator
    lines.push('@Component({');
    lines.push(`  selector: '${ctx.selector}',`);
    lines.push('  standalone: true,');
    if (materialImports.length > 0) {
      lines.push(`  imports: [${materialImports.join(', ')}],`);
    } else {
      lines.push('  imports: [],');
    }
    lines.push(`  templateUrl: './${ctx.fileName}.component.html',`);
    lines.push(`  styleUrl: './${ctx.fileName}.component.scss'`);
    lines.push('})');

    // Render class declaration
    const className = this.naming.generateClassName(doc.name);
    lines.push(`export class ${className} {`);

    // Render signal declarations for dependencies
    if (ctx.dependencyNames.size > 0) {
      for (const dep of [...ctx.dependencyNames].sort()) {
        lines.push(`  readonly ${dep} = signal<any>(null);`);
      }
    }

    // Render computed declarations
    if (ctx.computedDeclarations.length > 0) {
      for (const decl of ctx.computedDeclarations) {
        lines.push(`  ${decl}`);
      }
    }

    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }
}
