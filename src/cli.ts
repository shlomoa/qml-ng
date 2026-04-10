#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { convertQmlToAngularComponent } from './lib/converter/converter';

const [, , qmlPathArg, nameArg = 'generated-view'] = process.argv;

if (!qmlPathArg) {
  console.error('Usage: qml-ng <path-to-qml> [component-name]');
  process.exit(1);
}

const qmlPath = path.resolve(process.cwd(), qmlPathArg);
const qmlContent = fs.readFileSync(qmlPath, 'utf-8');
const result = convertQmlToAngularComponent({
  name: nameArg,
  qmlContent
});

console.log('Selector:', result.component.selector);
console.log('Class:', result.component.className);
console.log('\n=== HTML ===\n');
console.log(result.component.html);
console.log('\n=== SCSS ===\n');
console.log(result.component.scss);

if (result.diagnostics.length) {
  console.log('\n=== Diagnostics ===\n');
  for (const diagnostic of result.diagnostics) {
    console.log(diagnostic);
  }
}
