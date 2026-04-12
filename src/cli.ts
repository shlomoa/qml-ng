import * as fs from 'node:fs';
import * as path from 'node:path';
import { renderAngularMaterial } from './lib/angular/material-renderer';
import { qmlToUiDocument } from './lib/converter/qml-to-ui';
import { parseQml } from './lib/qml/parser';
import { formatDiagnostic } from './lib/schema/ui-schema';

function pascalCase(name: string): string {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

const [, , inputFile, ...rest] = process.argv;

if (!inputFile) {
  console.error('Usage: qml-ng <input.qml> --name <component-name>');
  process.exit(1);
}

const nameIndex = rest.indexOf('--name');
const rawName = nameIndex >= 0 ? rest[nameIndex + 1] : path.basename(inputFile, '.qml');
const componentName = rawName || 'qml-component';

const qml = fs.readFileSync(inputFile, 'utf-8');
const document = qmlToUiDocument(componentName, parseQml(qml));
const rendered = renderAngularMaterial(document, `${pascalCase(componentName)}Component`);

console.log('----- TS -----');
console.log(rendered.ts);
console.log('----- HTML -----');
console.log(rendered.html);
console.log('----- SCSS -----');
console.log(rendered.scss);
console.log('----- DIAGNOSTICS -----');
console.log(document.diagnostics.map(formatDiagnostic).join('\n') || 'None');
