import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { parseQml } from '../../lib/qml/parser';
import { qmlToUiDocument } from '../../lib/converter/qml-to-ui';
import { renderAngularMaterial } from '../../lib/angular/material-renderer';
import { FileSystemAdapter } from '../../lib/workspace/path-adapter';
import { WorkspaceFactory, WorkspaceLocation } from '../../lib/workspace/workspace-path';

interface Options {
  name: string;
  qmlFile: string;
  path?: string;
  project?: string;
}

function pascalCase(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

export function qmlComponentSchematic(options: Options): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    // Use FileSystemAdapter for boundary I/O
    const fsAdapter = new FileSystemAdapter();
    const qmlSource = fsAdapter.readQmlFile(options.qmlFile);

    const document = qmlToUiDocument(options.name, parseQml(qmlSource));
    const className = `${pascalCase(options.name)}Component`;
    const rendered = renderAngularMaterial(document, className);

    // Use workspace-aware path resolution
    let componentFiles;
    if (options.path) {
      // If explicit path provided, use it directly (backward compatibility)
      const basePath = options.path;
      componentFiles = {
        typescript: `${basePath}/${options.name}.component.ts`,
        template: `${basePath}/${options.name}.component.html`,
        style: `${basePath}/${options.name}.component.scss`,
      };
    } else {
      // Use workspace-aware resolution
      const resolver = WorkspaceFactory.createSimpleResolver();
      const location: WorkspaceLocation = {
        project: options.project ?? 'app',
        componentName: options.name,
      };
      componentFiles = resolver.resolveComponentFiles(location);
    }

    const outTree = _tree;
    outTree.create(componentFiles.typescript, rendered.ts);
    outTree.create(componentFiles.template, rendered.html);
    outTree.create(componentFiles.style, rendered.scss);

    if (document.diagnostics.length) {
      context.logger.warn(document.diagnostics.join('\n'));
    }

    return outTree;
  };
}
