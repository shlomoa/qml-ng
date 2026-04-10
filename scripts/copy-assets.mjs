import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const copies = [
  ['src/schematics/qml-component/schema.json', 'dist/schematics/qml-component/schema.json'],
  ['src/schematics/qml-component/files/__name@dasherize__/__name@dasherize__.component.html.template', 'dist/schematics/qml-component/files/__name@dasherize__/__name@dasherize__.component.html.template'],
  ['src/schematics/qml-component/files/__name@dasherize__/__name@dasherize__.component.ts.template', 'dist/schematics/qml-component/files/__name@dasherize__/__name@dasherize__.component.ts.template'],
  ['src/schematics/qml-component/files/__name@dasherize__/__name@dasherize__.component.scss.template', 'dist/schematics/qml-component/files/__name@dasherize__/__name@dasherize__.component.scss.template']
];

for (const [srcRel, destRel] of copies) {
  const src = path.join(root, srcRel);
  const dest = path.join(root, destRel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
