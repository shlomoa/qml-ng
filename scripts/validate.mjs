import { existsSync } from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function section(output, name) {
  const header = `----- ${name} -----`;
  const start = output.indexOf(header);
  if (start < 0) {
    throw new Error(`Missing ${name} section`);
  }

  const nextHeaders = ['TS', 'HTML', 'SCSS', 'DIAGNOSTICS']
    .filter(other => other !== name)
    .map(other => `----- ${other} -----`)
    .map(headerText => output.indexOf(headerText, start + header.length))
    .filter(index => index >= 0);

  const end = nextHeaders.length ? Math.min(...nextHeaders) : output.length;
  return output.slice(start + header.length, end).trim();
}

function assertContains(text, snippet, label) {
  if (!text.includes(snippet)) {
    throw new Error(`Expected ${label} to contain:\n${snippet}`);
  }
}

function pascalCase(name) {
  return name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

async function runCliSmokeTest() {
  const cliPath = path.join(repoRoot, 'dist', 'cli.js');
  if (!existsSync(cliPath)) {
    throw new Error(`Missing compiled CLI at ${cliPath}. Run npm run build first.`);
  }

  const originalArgv = process.argv;
  const originalLog = console.log;
  const originalError = console.error;
  const originalExit = process.exit;
  const stdout = [];
  const stderr = [];

  console.log = (...args) => {
    stdout.push(args.join(' '));
  };
  console.error = (...args) => {
    stderr.push(args.join(' '));
  };
  process.exit = code => {
    throw new Error(`CLI exited early with code ${code ?? 0}.`);
  };
  process.argv = [process.execPath, cliPath, 'examples/login.qml', '--name', 'login-form'];

  try {
    await import(`${pathToFileURL(cliPath).href}?validate=${Date.now()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const details = [...stdout, ...stderr, message].filter(Boolean).join('\n');
    throw new Error(`CLI smoke test failed.\n${details}`);
  } finally {
    process.argv = originalArgv;
    console.log = originalLog;
    console.error = originalError;
    process.exit = originalExit;
  }

  return stdout.join('\n');
}

console.log('Running CLI smoke test...');
const output = await runCliSmokeTest();

const ts = section(output, 'TS');
const html = section(output, 'HTML');
const scss = section(output, 'SCSS');
const diagnostics = section(output, 'DIAGNOSTICS');

assertContains(output, '----- TS -----', 'CLI output');
assertContains(output, '----- HTML -----', 'CLI output');
assertContains(output, '----- SCSS -----', 'CLI output');
assertContains(output, '----- DIAGNOSTICS -----', 'CLI output');

assertContains(ts, "import { Component, computed, signal } from '@angular/core';", 'TS section');
assertContains(ts, "import { MatButtonModule } from '@angular/material/button';", 'TS section');
assertContains(ts, "import { MatFormFieldModule } from '@angular/material/form-field';", 'TS section');
assertContains(ts, "import { MatInputModule } from '@angular/material/input';", 'TS section');
assertContains(ts, "selector: 'app-login-form'", 'TS section');
assertContains(ts, `export class ${pascalCase('login-form')}Component`, 'TS section');
assertContains(ts, 'readonly user = signal<any>(null);', 'TS section');
assertContains(ts, 'readonly textExpr1 = computed(() => user().name);', 'TS section');

assertContains(html, '<div class="qml-column">', 'HTML section');
assertContains(html, '<span>{{ textExpr1() }}</span>', 'HTML section');
assertContains(html, '<mat-form-field appearance="outline">', 'HTML section');
assertContains(html, `<input matInput [placeholder]='"Email"'>`, 'HTML section');
assertContains(html, '<button mat-raised-button (click)="submit()">{{ "Submit" }}</button>', 'HTML section');

assertContains(scss, ':host {', 'SCSS section');
assertContains(scss, '  display: block;', 'SCSS section');
assertContains(scss, '.qml-column {', 'SCSS section');
assertContains(scss, '  display: flex;', 'SCSS section');
assertContains(scss, 'justify-content: center;', 'SCSS section');
assertContains(scss, 'align-items: center;', 'SCSS section');

if (diagnostics !== 'None') {
  throw new Error(`Expected diagnostics to be None, got:\n${diagnostics}`);
}

console.log('Validation passed.');
