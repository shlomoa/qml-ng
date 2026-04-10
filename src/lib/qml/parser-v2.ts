import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  QmlDocument,
  QmlObjectNode,
  QmlProperty,
  QmlValue,
  QmlHandler,
  QmlSignal,
  QmlFunction,
  QmlImport,
  QmlPragma,
  QmlPropertyKind
} from './ast';
import { Token, tokenizeQml } from './tokenizer';
import { SourceRange, createDiagnostic, UiDiagnostic } from '../schema/ui-schema';

export interface QmlParseOptions {
  filePath?: string;
  searchRoots?: string[];
}

export interface QmlParseResult {
  document: QmlDocument;
  diagnostics: UiDiagnostic[];
}

class ParseError extends Error {
  constructor(
    message: string,
    public location?: SourceRange,
    public category: 'lexical' | 'syntax' = 'syntax'
  ) {
    super(message);
  }
}

function candidatePaths(typeName: string): string[] {
  return [`${typeName}.qml`, `${typeName}.ui.qml`];
}

function collectFiles(rootDir: string, names: Set<string>, output: string[]): void {
  try {
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
  } catch {
    // Silently skip inaccessible directories
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
    try {
      if (fs.existsSync(normalized) && fs.statSync(normalized).isFile()) {
        seen.add(normalized);
        candidates.push(normalized);
      }
    } catch {
      // Skip files we can't access
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
  private diagnostics: UiDiagnostic[] = [];
  private readonly filePath: string;

  constructor(
    private readonly tokens: Token[],
    private readonly options: QmlParseOptions
  ) {
    this.filePath = options.filePath ?? '<unknown>';
  }

  parseDocument(): QmlParseResult {
    const imports: QmlImport[] = [];
    const pragmas: QmlPragma[] = [];

    try {
      this.skipNoise();
      this.parsePreamble(imports, pragmas);
      this.skipNoise();

      if (this.match('eof')) {
        this.addDiagnostic('error', 'syntax', 'Expected root object, but found end of file');
        // Create a placeholder root
        const root: QmlObjectNode = {
          kind: 'object',
          typeName: 'Item',
          properties: [],
          handlers: [],
          signals: [],
          functions: [],
          children: []
        };
        return { document: { root, imports, pragmas }, diagnostics: this.diagnostics };
      }

      const rootType = this.parseTypeName();
      this.skipNoise();
      const root = this.parseObjectBody(rootType, false);

      return {
        document: { root, imports, pragmas },
        diagnostics: this.diagnostics
      };
    } catch (error) {
      if (error instanceof ParseError) {
        this.addDiagnostic('error', error.category, error.message, error.location);
      } else {
        this.addDiagnostic('error', 'syntax', `Parse error: ${error}`);
      }

      // Return a placeholder document
      const root: QmlObjectNode = {
        kind: 'object',
        typeName: 'Item',
        properties: [],
        handlers: [],
        signals: [],
        functions: [],
        children: []
      };
      return { document: { root, imports, pragmas }, diagnostics: this.diagnostics };
    }
  }

  private parsePreamble(imports: QmlImport[], pragmas: QmlPragma[]): void {
    while (!this.match('eof')) {
      this.skipNoise();

      if (this.peek().kind !== 'identifier') {
        break;
      }

      const keyword = this.peek().value;
      if (keyword === 'import') {
        const imp = this.parseImport();
        if (imp) imports.push(imp);
        continue;
      }

      if (keyword === 'pragma') {
        const pragma = this.parsePragma();
        if (pragma) pragmas.push(pragma);
        continue;
      }

      break;
    }
  }

  private parseImport(): QmlImport | undefined {
    const start = this.peek().location;
    this.expect('identifier'); // 'import'

    try {
      const module = this.parseQualifiedOrString();
      let version: string | undefined;
      let alias: string | undefined;

      // Check for version
      if (this.match('number')) {
        const major = this.expect('number').value;
        if (this.match('dot')) {
          this.expect('dot');
          const minor = this.expect('number').value;
          version = `${major}.${minor}`;
        } else {
          version = major;
        }
      }

      // Check for 'as' alias
      if (this.match('identifier') && this.peek().value === 'as') {
        this.expect('identifier'); // 'as'
        alias = this.expect('identifier').value;
      }

      this.skipLine();

      const end = this.tokens[Math.max(0, this.index - 1)].location;
      return {
        module,
        version,
        alias,
        location: { start, end }
      };
    } catch (error) {
      this.addDiagnostic('warning', 'syntax', `Invalid import statement: ${error}`);
      this.skipLine();
      return undefined;
    }
  }

  private parsePragma(): QmlPragma | undefined {
    const start = this.peek().location;
    this.expect('identifier'); // 'pragma'

    try {
      const name = this.expect('identifier').value;
      let value: string | undefined;

      if (this.match('identifier')) {
        value = this.expect('identifier').value;
      }

      this.skipLine();

      const end = this.tokens[Math.max(0, this.index - 1)].location;
      return {
        name,
        value,
        location: { start, end }
      };
    } catch (error) {
      this.addDiagnostic('warning', 'syntax', `Invalid pragma statement: ${error}`);
      this.skipLine();
      return undefined;
    }
  }

  private parseQualifiedOrString(): string {
    if (this.match('string')) {
      return this.expect('string').value;
    }
    return this.parseQualifiedId();
  }

  private parseQualifiedId(): string {
    let name = this.expect('identifier').value;
    while (this.match('dot')) {
      this.expect('dot');
      if (this.match('identifier')) {
        name += '.' + this.expect('identifier').value;
      } else {
        break;
      }
    }
    return name;
  }

  private parseObjectBody(type: string, resolveSourcePath: boolean): QmlObjectNode {
    const start = this.peek().location;
    this.expect('lbrace');

    const properties: QmlProperty[] = [];
    const handlers: QmlHandler[] = [];
    const signals: QmlSignal[] = [];
    const functions: QmlFunction[] = [];
    const children: QmlObjectNode[] = [];

    while (!this.match('rbrace') && !this.match('eof')) {
      this.skipNoise();
      if (this.match('rbrace')) break;

      try {
        if (this.isFunctionDeclaration()) {
          const fn = this.parseFunctionDeclaration();
          if (fn) functions.push(fn);
        } else if (this.isSignalDeclaration()) {
          const sig = this.parseSignalDeclaration();
          if (sig) signals.push(sig);
        } else if (this.isComponentDeclaration()) {
          children.push(this.parseComponentDeclaration());
        } else if (this.isHandlerName(this.peek().value)) {
          const handler = this.parseHandler();
          if (handler) handlers.push(handler);
        } else if (this.looksLikeProperty()) {
          const prop = this.parseProperty();
          if (prop) properties.push(prop);
        } else if (this.looksLikeObject()) {
          const childType = this.parseTypeName();
          this.skipNoise();
          children.push(this.parseObjectBody(childType, true));
        } else {
          // Recovery: skip unknown token
          this.addDiagnostic(
            'warning',
            'syntax',
            `Unexpected token '${this.peek().value}' in object body`,
            { start: this.peek().location, end: this.peek().location }
          );
          this.index += 1;
        }
      } catch (error) {
        if (error instanceof ParseError) {
          this.addDiagnostic('error', error.category, error.message, error.location);
        }
        // Recovery: skip to next property/object boundary
        this.recoverToNextMember();
      }

      this.skipNoise();
    }

    this.expect('rbrace');
    const end = this.tokens[Math.max(0, this.index - 1)].location;

    const node: QmlObjectNode = {
      kind: 'object',
      typeName: type,
      properties,
      handlers,
      signals,
      functions,
      children,
      location: { start, end }
    };

    if (resolveSourcePath) {
      node.resolvedSourcePath = resolveQmlObjectSourcePath(type, this.options);
    }

    return node;
  }

  private parseProperty(): QmlProperty | undefined {
    const start = this.peek().location;

    if (this.isTypedPropertyPrefix()) {
      return this.parseTypedProperty();
    }

    const name = this.parseDottedName();
    if (!this.match('colon')) {
      throw new ParseError(
        `Expected ':' after property name '${name}'`,
        { start, end: this.peek().location }
      );
    }
    this.expect('colon');
    return this.parsePropertyValue(name, 'simple', start);
  }

  private parseDottedName(): string {
    let name = this.expect('identifier').value;
    while (this.match('dot')) {
      this.expect('dot');
      name += '.' + this.expect('identifier').value;
    }
    return name;
  }

  private parseTypedProperty(): QmlProperty | undefined {
    const start = this.peek().location;
    let propertyKind: QmlPropertyKind = 'typed';
    let typeName: string | undefined;

    // Parse property prefix
    const prefix = this.peek().value;
    if (prefix === 'readonly') {
      this.expect('identifier'); // 'readonly'
      propertyKind = 'readonly';
      this.expect('identifier'); // 'property'
    } else if (prefix === 'required') {
      this.expect('identifier'); // 'required'
      propertyKind = 'required';
      this.expect('identifier'); // 'property'
    } else if (prefix === 'default') {
      this.expect('identifier'); // 'default'
      propertyKind = 'default';
      this.expect('identifier'); // 'property'
    } else {
      this.expect('identifier'); // 'property'
    }

    // Check for alias
    if (this.match('identifier') && this.peek().value === 'alias') {
      this.expect('identifier'); // 'alias'
      propertyKind = 'alias';
      const name = this.expect('identifier').value;

      if (!this.match('colon')) {
        // Alias without value
        const end = this.tokens[Math.max(0, this.index - 1)].location;
        return {
          name,
          value: { kind: 'identifier', value: '' },
          propertyKind,
          location: { start, end }
        };
      }

      this.expect('colon');
      return this.parsePropertyValue(name, propertyKind, start, typeName);
    }

    // Parse type
    typeName = this.parseQualifiedId();

    // Parse name
    const name = this.expect('identifier').value;

    if (!this.match('colon')) {
      // Property declaration without value
      const end = this.tokens[Math.max(0, this.index - 1)].location;
      return {
        name,
        value: { kind: 'identifier', value: '' },
        propertyKind,
        typeName,
        location: { start, end }
      };
    }

    this.expect('colon');
    return this.parsePropertyValue(name, propertyKind, start, typeName);
  }

  private parsePropertyValue(
    name: string,
    propertyKind: QmlPropertyKind,
    start: SourceRange['start'],
    typeName?: string
  ): QmlProperty {
    // Try inline object
    const inlineObject = this.tryParseInlineObject();
    if (inlineObject) {
      const end = this.tokens[Math.max(0, this.index - 1)].location;
      return {
        name,
        value: { kind: 'identifier', value: inlineObject.typeName },
        embeddedObject: inlineObject,
        propertyKind,
        typeName,
        location: { start, end }
      };
    }

    // Try array
    if (this.match('lbracket')) {
      const arrayValue = this.parseArray();
      const end = this.tokens[Math.max(0, this.index - 1)].location;
      return {
        name,
        value: arrayValue,
        propertyKind,
        typeName,
        location: { start, end }
      };
    }

    const token = this.peek();

    // String literal
    if (token.kind === 'string') {
      this.index += 1;
      const end = this.tokens[Math.max(0, this.index - 1)].location;
      return {
        name,
        value: {
          kind: 'string',
          value: token.value,
          location: { start: token.location, end: token.location }
        },
        propertyKind,
        typeName,
        location: { start, end }
      };
    }

    // Number literal
    if (token.kind === 'number') {
      this.index += 1;
      const end = this.tokens[Math.max(0, this.index - 1)].location;
      return {
        name,
        value: {
          kind: 'number',
          value: Number(token.value),
          location: { start: token.location, end: token.location }
        },
        propertyKind,
        typeName,
        location: { start, end }
      };
    }

    // Expression or identifier
    const exprStart = this.index;
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
    const end = this.tokens[Math.max(0, this.index - 1)].location;

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text)) {
      return {
        name,
        value: { kind: 'identifier', value: text },
        propertyKind,
        typeName,
        location: { start, end }
      };
    }

    if (!text) {
      const fallback = this.tokens[exprStart];
      return {
        name,
        value: { kind: 'expression', value: fallback?.value ?? '' },
        propertyKind,
        typeName,
        location: { start, end }
      };
    }

    return {
      name,
      value: { kind: 'expression', value: text },
      propertyKind,
      typeName,
      location: { start, end }
    };
  }

  private parseArray(): QmlValue {
    const start = this.peek().location;
    this.expect('lbracket');

    const elements: QmlValue[] = [];
    this.skipNoise();

    while (!this.match('rbracket') && !this.match('eof')) {
      // Parse array element (simplified - could be literal, expression, or object)
      if (this.match('string')) {
        const token = this.expect('string');
        elements.push({
          kind: 'string',
          value: token.value,
          location: { start: token.location, end: token.location }
        });
      } else if (this.match('number')) {
        const token = this.expect('number');
        elements.push({
          kind: 'number',
          value: Number(token.value),
          location: { start: token.location, end: token.location }
        });
      } else if (this.match('identifier')) {
        const token = this.expect('identifier');
        elements.push({
          kind: 'identifier',
          value: token.value,
          location: { start: token.location, end: token.location }
        });
      } else {
        // Skip unexpected token
        this.index += 1;
      }

      this.skipNoise();
      if (this.match('comma')) {
        this.expect('comma');
        this.skipNoise();
      }
    }

    this.expect('rbracket');
    const end = this.tokens[Math.max(0, this.index - 1)].location;

    return {
      kind: 'array',
      elements,
      location: { start, end }
    };
  }

  private parseHandler(): QmlHandler | undefined {
    const start = this.peek().location;
    const name = this.expect('identifier').value;
    this.expect('colon');

    const bodyParts: string[] = [];
    let braceDepth = 0;

    // Check if it's a block handler
    if (this.match('lbrace')) {
      this.index += 1;
      braceDepth = 1;

      while (!this.match('eof') && braceDepth > 0) {
        const token = this.peek();
        if (token.kind === 'lbrace') braceDepth += 1;
        if (token.kind === 'rbrace') {
          braceDepth -= 1;
          if (braceDepth === 0) {
            this.index += 1;
            break;
          }
        }
        bodyParts.push(this.tokenText(token));
        this.index += 1;
      }
    } else {
      // Single statement handler
      while (!this.match('eof') && !this.match('newline') && !this.match('rbrace')) {
        bodyParts.push(this.tokenText(this.peek()));
        this.index += 1;
      }
    }

    const end = this.tokens[Math.max(0, this.index - 1)].location;
    return {
      name,
      body: bodyParts.join('').trim(),
      location: { start, end }
    };
  }

  private parseSignalDeclaration(): QmlSignal | undefined {
    const start = this.peek().location;
    this.expect('identifier'); // 'signal'

    const name = this.expect('identifier').value;
    const parameters: Array<{ name: string; type?: string }> = [];

    // Parse optional parameters
    if (this.match('other') && this.peek().value === '(') {
      this.index += 1; // '('
      this.skipNoise();

      while (!this.match('eof') && !(this.match('other') && this.peek().value === ')')) {
        if (this.match('identifier')) {
          const paramName = this.expect('identifier').value;
          parameters.push({ name: paramName });
        }
        this.skipNoise();
        if (this.match('comma')) {
          this.expect('comma');
          this.skipNoise();
        }
      }

      if (this.match('other') && this.peek().value === ')') {
        this.index += 1; // ')'
      }
    }

    this.skipLine();
    const end = this.tokens[Math.max(0, this.index - 1)].location;

    return {
      name,
      parameters,
      location: { start, end }
    };
  }

  private parseFunctionDeclaration(): QmlFunction | undefined {
    const start = this.peek().location;
    this.expect('identifier'); // 'function'

    const name = this.expect('identifier').value;
    const parameters: Array<{ name: string; type?: string }> = [];

    // Parse parameters
    if (this.match('other') && this.peek().value === '(') {
      this.index += 1; // '('
      this.skipNoise();

      while (!this.match('eof') && !(this.match('other') && this.peek().value === ')')) {
        if (this.match('identifier')) {
          const paramName = this.expect('identifier').value;
          parameters.push({ name: paramName });
        }
        this.skipNoise();
        if (this.match('comma')) {
          this.expect('comma');
          this.skipNoise();
        }
      }

      if (this.match('other') && this.peek().value === ')') {
        this.index += 1; // ')'
      }
    }

    this.skipNoise();

    // Parse function body
    const bodyParts: string[] = [];
    if (this.match('lbrace')) {
      this.skipBalancedBlock(bodyParts);
    }

    const end = this.tokens[Math.max(0, this.index - 1)].location;

    return {
      name,
      parameters,
      body: bodyParts.join('').trim(),
      location: { start, end }
    };
  }

  private parseComponentDeclaration(): QmlObjectNode {
    const start = this.peek().location;
    this.expect('identifier'); // 'component'
    this.expect('identifier'); // component name
    this.expect('colon');
    const type = this.parseTypeName();
    this.skipNoise();
    return this.parseObjectBody(type, true);
  }

  private tryParseInlineObject(): QmlObjectNode | undefined {
    if (this.peek().kind !== 'identifier') {
      return undefined;
    }

    const startIndex = this.index;
    const type = this.parseTypeName();
    this.skipNoise();

    if (!this.match('lbrace')) {
      this.index = startIndex;
      return undefined;
    }

    return this.parseObjectBody(type, true);
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

  private isHandlerName(name: string): boolean {
    return name.startsWith('on') && name.length > 2 && /^[A-Z]/.test(name[2]);
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

  private skipBalancedBlock(capture?: string[]): void {
    if (!this.match('lbrace')) {
      return;
    }

    let depth = 0;
    while (!this.match('eof')) {
      const token = this.peek();
      if (token.kind === 'lbrace') depth += 1;
      if (token.kind === 'rbrace') {
        depth -= 1;
        if (capture) capture.push(token.value);
        this.index += 1;
        if (depth === 0) {
          return;
        }
        continue;
      }
      if (capture) capture.push(this.tokenText(token));
      this.index += 1;
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

  private recoverToNextMember(): void {
    // Skip until we find a likely member boundary
    let depth = 0;
    while (!this.match('eof')) {
      if (this.match('lbrace')) depth += 1;
      if (this.match('rbrace')) {
        if (depth === 0) break;
        depth -= 1;
      }
      if (depth === 0 && this.match('identifier')) {
        // Check if this looks like a new member
        if (
          this.isTypedPropertyPrefix() ||
          this.isFunctionDeclaration() ||
          this.isSignalDeclaration() ||
          this.looksLikeProperty()
        ) {
          break;
        }
      }
      this.index += 1;
    }
  }

  private match(kind: Token['kind']): boolean {
    return this.peek().kind === kind;
  }

  private peek(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1];
  }

  private expect(kind: Token['kind']): Token {
    const token = this.peek();
    if (token.kind !== kind) {
      throw new ParseError(
        `Expected token '${kind}' but got '${token.kind}' ('${token.value}')`,
        { start: token.location, end: token.location },
        'syntax'
      );
    }
    this.index += 1;
    return token;
  }

  private addDiagnostic(
    severity: 'error' | 'warning' | 'info',
    category: 'lexical' | 'syntax' | 'semantic' | 'unsupported',
    message: string,
    location?: SourceRange
  ): void {
    this.diagnostics.push(
      createDiagnostic(severity, category, message, location, this.filePath)
    );
  }
}

export function parseQmlV2(source: string, options: QmlParseOptions = {}): QmlParseResult {
  const tokens = tokenizeQml(source);
  const parser = new Parser(tokens, options);
  return parser.parseDocument();
}
