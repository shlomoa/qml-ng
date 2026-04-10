import * as fs from 'node:fs';
import * as path from 'node:path';
import { QmlDocument, QmlObjectNode, QmlProperty, QmlValue } from './ast';
import { Token, tokenizeQml } from './tokenizer';

export interface QmlParseOptions {
  filePath?: string;
  searchRoots?: string[];
}

function candidatePaths(typeName: string): string[] {
  return [`${typeName}.qml`, `${typeName}.ui.qml`];
}

function collectFiles(rootDir: string, names: Set<string>, output: string[]): void {
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, names, output);
      continue;
    }

    if (entry.isFile() && names.has(entry.name)) {
      output.push(fullPath);
    }
  }
}

function resolveQmlObjectSourcePath(typeName: string, options: QmlParseOptions = {}): string | undefined {
  const names = candidatePaths(typeName);
  const candidates: string[] = [];
  const seen = new Set<string>();

  const addCandidate = (candidate: string) => {
    const normalized = path.normalize(candidate);
    if (seen.has(normalized)) {
      return;
    }
    if (fs.existsSync(normalized) && fs.statSync(normalized).isFile()) {
      seen.add(normalized);
      candidates.push(normalized);
    }
  };

  if (options.filePath) {
    const dir = path.dirname(options.filePath);
    for (const name of names) {
      addCandidate(path.join(dir, name));
    }
  }

  for (const root of options.searchRoots ?? []) {
    collectFiles(root, new Set(names), candidates);
  }

  return candidates.sort((left, right) => left.localeCompare(right))[0];
}

class Parser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly options: QmlParseOptions
  ) {}

  parseDocument(): QmlDocument {
    this.skipNoise();
    this.skipTopLevelPreamble();
    this.skipNoise();
    const rootType = this.parseTypeName();
    this.skipNoise();
    const root = this.parseObjectBody(rootType, false);
    return { root };
  }

  private parseObjectBody(type: string, resolveSourcePath: boolean): QmlObjectNode {
    this.expect('lbrace');

    const properties: QmlProperty[] = [];
    const children: QmlObjectNode[] = [];

    while (!this.match('rbrace') && !this.match('eof')) {
      this.skipNoise();
      if (this.match('rbrace')) break;

      if (this.isFunctionDeclaration()) {
        this.skipFunctionDeclaration();
      } else if (this.isSignalDeclaration()) {
        this.skipSignalDeclaration();
      } else if (this.isComponentDeclaration()) {
        children.push(this.parseComponentDeclaration());
      } else if (this.looksLikeProperty()) {
        properties.push(this.parseProperty());
      } else if (this.looksLikeObject()) {
        const type = this.parseTypeName();
        this.skipNoise();
        children.push(this.parseObjectBody(type, true));
      } else {
        this.index += 1;
      }
      this.skipNoise();
    }

    this.expect('rbrace');
    const node: QmlObjectNode = {
      kind: 'object',
      typeName: type,
      properties,
      children
    };

    if (resolveSourcePath) {
      node.resolvedSourcePath = resolveQmlObjectSourcePath(type, this.options);
    }

    return node;
  }

  private parseProperty(): QmlProperty {
    if (this.isTypedPropertyPrefix()) {
      return this.parseTypedProperty();
    }

    const name = this.parseDottedName();
    this.expect('colon');
    return this.parsePropertyValue(name);
  }

  private parseDottedName(): string {
    let name = this.expect('identifier').value;
    while (this.match('dot')) {
      this.expect('dot');
      name += '.' + this.expect('identifier').value;
    }
    return name;
  }

  private parseTypedProperty(): QmlProperty {
    const parts: string[] = [];
    while (!this.match('colon') && !this.match('newline') && !this.match('rbrace') && !this.match('eof')) {
      const token = this.peek();
      if (token.kind === 'identifier') {
        parts.push(token.value);
      }
      this.index += 1;
    }

    if (!parts.length) {
      throw new Error(`Expected typed property name at ${this.peek().position}`);
    }

    const name = parts[parts.length - 1];

    if (!this.match('colon')) {
      return { name, value: { kind: 'expression', value: '' } };
    }

    this.expect('colon');
    return this.parsePropertyValue(name);
  }

  private parsePropertyValue(name: string): QmlProperty {
    const inlineObject = this.tryParseInlineObject();
    if (inlineObject) {
      return {
        name,
        value: { kind: 'identifier', value: inlineObject.typeName },
        embeddedObject: inlineObject
      };
    }

    const token = this.peek();

    if (token.kind === 'string') {
      this.index += 1;
      return { name, value: { kind: 'string', value: token.value } };
    }

    if (token.kind === 'number') {
      this.index += 1;
      return { name, value: { kind: 'number', value: Number(token.value) } };
    }

    const start = this.index;
    const parts: string[] = [];
    let braceDepth = 0;
    let bracketDepth = 0;
    let parenDepth = 0;

    while (!this.match('eof')) {
      const t = this.peek();
      if (t.kind === 'newline' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) break;
      if (t.kind === 'rbrace' && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) break;

      if (t.kind === 'lbrace') braceDepth += 1;
      if (t.kind === 'rbrace') braceDepth -= 1;
      if (t.kind === 'lbracket') bracketDepth += 1;
      if (t.kind === 'rbracket') bracketDepth -= 1;
      if (t.kind === 'other' && t.value === '(') parenDepth += 1;
      if (t.kind === 'other' && t.value === ')') parenDepth -= 1;

      parts.push(this.tokenText(t));
      this.index += 1;
    }

    const text = parts.join('').trim();
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text)) {
      return { name, value: { kind: 'identifier', value: text } };
    }

    if (!text) {
      const fallback = this.tokens[start];
      return { name, value: { kind: 'expression', value: fallback?.value ?? '' } };
    }

    return { name, value: { kind: 'expression', value: text } };
  }

  private tokenText(token: Token): string {
    if (token.kind === 'string') return JSON.stringify(token.value);
    return token.value;
  }

  private looksLikeProperty(): boolean {
    let i = this.index;
    if (this.tokens[i]?.kind !== 'identifier') return false;
    if (this.isTypedPropertyPrefix()) return true;
    while (!['colon', 'newline', 'rbrace', 'eof'].includes(this.tokens[i]?.kind ?? 'eof')) {
      if (this.tokens[i]?.kind === 'lbrace') return false;
      i += 1;
    }
    return this.tokens[i]?.kind === 'colon';
  }

  private isTypedPropertyPrefix(): boolean {
    if (this.peek().kind !== 'identifier') return false;
    return ['property', 'readonly', 'required', 'default'].includes(this.peek().value);
  }

  private isFunctionDeclaration(): boolean {
    return this.peek().kind === 'identifier' && this.peek().value === 'function';
  }

  private isSignalDeclaration(): boolean {
    return this.peek().kind === 'identifier' && this.peek().value === 'signal';
  }

  private isComponentDeclaration(): boolean {
    return this.peek().kind === 'identifier' && this.peek().value === 'component';
  }

  private looksLikeObject(): boolean {
    let i = this.index;
    if (this.tokens[i]?.kind !== 'identifier') return false;
    i += 1;
    while (this.tokens[i]?.kind === 'dot') {
      i += 1;
      if (this.tokens[i]?.kind !== 'identifier') return false;
      i += 1;
    }
    return this.tokens[i]?.kind === 'lbrace';
  }

  private parseTypeName(): string {
    let name = this.expect('identifier').value;
    while (this.match('dot')) {
      this.expect('dot');
      name += '.' + this.expect('identifier').value;
    }
    return name;
  }

  private parseComponentDeclaration(): QmlObjectNode {
    this.expect('identifier');
    this.expect('identifier');
    this.expect('colon');
    const type = this.parseTypeName();
    this.skipNoise();
    return this.parseObjectBody(type, true);
  }

  private tryParseInlineObject(): QmlObjectNode | undefined {
    if (this.peek().kind !== 'identifier') {
      return undefined;
    }

    const start = this.index;
    const type = this.parseTypeName();
    this.skipNoise();

    if (!this.match('lbrace')) {
      this.index = start;
      return undefined;
    }

    return this.parseObjectBody(type, true);
  }

  private skipFunctionDeclaration(): void {
    this.index += 1;
    while (!this.match('eof') && !this.match('lbrace')) {
      this.index += 1;
    }
    if (this.match('lbrace')) {
      this.skipBalancedBlock();
    }
  }

  private skipSignalDeclaration(): void {
    while (!this.match('eof') && !this.match('newline') && !this.match('rbrace')) {
      this.index += 1;
    }
  }

  private skipBalancedBlock(): void {
    if (!this.match('lbrace')) {
      return;
    }

    let depth = 0;
    while (!this.match('eof')) {
      const token = this.peek();
      if (token.kind === 'lbrace') depth += 1;
      if (token.kind === 'rbrace') {
        depth -= 1;
        this.index += 1;
        if (depth === 0) {
          return;
        }
        continue;
      }
      this.index += 1;
    }
  }

  private skipTopLevelPreamble(): void {
    while (!this.match('eof')) {
      this.skipNoise();

      if (this.peek().kind !== 'identifier') {
        break;
      }

      if (this.peek().value === 'import' || this.peek().value === 'pragma') {
        this.skipLine();
        continue;
      }

      break;
    }
  }

  private skipLine(): void {
    while (!this.match('eof') && !this.match('newline')) {
      this.index += 1;
    }
    this.skipNoise();
  }

  private skipNoise(): void {
    while (['newline', 'comma'].includes(this.peek().kind)) {
      this.index += 1;
    }
  }

  private match(kind: Token['kind']): boolean {
    return this.peek().kind === kind;
  }

  private peek(): Token {
    return this.tokens[this.index];
  }

  private expect(kind: Token['kind']): Token {
    const token = this.peek();
    if (token.kind !== kind) {
      throw new Error(`Expected token ${kind} but got ${token.kind} at ${token.position}`);
    }
    this.index += 1;
    return token;
  }
}

export function parseQml(source: string, options: QmlParseOptions = {}): QmlDocument {
  const tokens = tokenizeQml(source);
  const parser = new Parser(tokens, options);
  return parser.parseDocument();
}
