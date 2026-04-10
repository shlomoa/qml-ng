import { QmlDocument, QmlObjectNode, QmlProperty, QmlValue } from './ast';
import { Token, tokenizeQml } from './tokenizer';

class Parser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parseDocument(): QmlDocument {
    this.skipNoise();
    this.skipTopLevelPreamble();
    this.skipNoise();
    const root = this.parseObject();
    return { root };
  }

  private parseObject(): QmlObjectNode {
    const type = this.expect('identifier').value;
    this.skipNoise();
    this.expect('lbrace');

    const properties: QmlProperty[] = [];
    const children: QmlObjectNode[] = [];

    while (!this.match('rbrace') && !this.match('eof')) {
      this.skipNoise();
      if (this.match('rbrace')) break;

      if (this.looksLikeProperty()) {
        properties.push(this.parseProperty());
      } else if (this.peek().kind === 'identifier') {
        children.push(this.parseObject());
      } else {
        this.index += 1;
      }
      this.skipNoise();
    }

    this.expect('rbrace');
    return {
      kind: 'object',
      typeName: type,
      properties,
      children
    };
  }

  private parseProperty(): QmlProperty {
    const name = this.parsePropertyName();
    this.expect('colon');
    const value = this.parsePropertyValue();
    return { name, value };
  }

  private parsePropertyName(): string {
    if (this.isTypedPropertyPrefix()) {
      const parts: string[] = [];
      while (!this.match('colon') && !this.match('eof')) {
        const token = this.peek();
        if (token.kind === 'identifier') {
          parts.push(token.value);
        }
        this.index += 1;
      }
      if (!parts.length) {
        throw new Error(`Expected typed property name at ${this.peek().position}`);
      }
      return parts[parts.length - 1];
    }

    let name = this.expect('identifier').value;
    while (this.match('dot')) {
      this.expect('dot');
      name += '.' + this.expect('identifier').value;
    }
    return name;
  }

  private parsePropertyValue(): QmlValue {
    const token = this.peek();

    if (token.kind === 'string') {
      this.index += 1;
      return { kind: 'string', value: token.value };
    }

    if (token.kind === 'number') {
      this.index += 1;
      return { kind: 'number', value: Number(token.value) };
    }

    const start = this.index;
    const parts: string[] = [];
    let braceDepth = 0;
    let bracketDepth = 0;

    while (!this.match('eof')) {
      const t = this.peek();
      if (t.kind === 'newline' && braceDepth === 0 && bracketDepth === 0) break;
      if (t.kind === 'rbrace' && braceDepth === 0 && bracketDepth === 0) break;

      if (t.kind === 'lbrace') braceDepth += 1;
      if (t.kind === 'rbrace') braceDepth -= 1;
      if (t.kind === 'lbracket') bracketDepth += 1;
      if (t.kind === 'rbracket') bracketDepth -= 1;

      parts.push(this.tokenText(t));
      this.index += 1;
    }

    const text = parts.join('').trim();
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text)) {
      return { kind: 'identifier', value: text };
    }

    if (!text) {
      const fallback = this.tokens[start];
      return { kind: 'expression', value: fallback?.value ?? '' };
    }

    return { kind: 'expression', value: text };
  }

  private tokenText(token: Token): string {
    if (token.kind === 'string') return JSON.stringify(token.value);
    return token.value;
  }

  private looksLikeProperty(): boolean {
    let i = this.index;
    if (this.tokens[i]?.kind !== 'identifier') return false;
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

export function parseQml(source: string): QmlDocument {
  const tokens = tokenizeQml(source);
  const parser = new Parser(tokens);
  return parser.parseDocument();
}
