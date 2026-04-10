import { renderAngularMaterial } from '../angular/material-renderer';
import { GeneratedComponentModel } from '../angular/component-template-model';
import { parseQml } from '../qml/qml-parser';
import { toPascalCase, toKebabCase } from '../utils/names';
import { qmlToUiDocument } from './qml-to-schema';

export interface ConvertQmlOptions {
  name: string;
  selectorPrefix?: string;
  qmlContent: string;
}

export interface ConvertQmlResult {
  component: GeneratedComponentModel;
  diagnostics: string[];
}

export function convertQmlToAngularComponent(options: ConvertQmlOptions): ConvertQmlResult {
  const ast = parseQml(options.qmlContent);
  const uiDocument = qmlToUiDocument(ast);
  const rendered = renderAngularMaterial(uiDocument);

  const kebabName = toKebabCase(options.name);
  const className = `${toPascalCase(options.name)}Component`;
  const selectorPrefix = options.selectorPrefix ?? 'app';

  return {
    component: {
      className,
      selector: `${selectorPrefix}-${kebabName}`,
      html: rendered.html,
      scss: rendered.scss,
      angularImports: rendered.imports
    },
    diagnostics: uiDocument.diagnostics.map((d) => `[${d.level}] ${d.code}: ${d.message}`)
  };
}
