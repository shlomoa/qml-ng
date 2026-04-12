/**
 * Expression tokenizer for QML expressions
 */

export type TokenType =
  | 'number'
  | 'string'
  | 'identifier'
  | 'true'
  | 'false'
  | 'null'
  | 'undefined'
  | 'operator'
  | 'dot'
  | 'optional-chain'
  | 'question'
  | 'colon'
  | 'comma'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'eof'
  | 'error';

export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

export class ExpressionTokenizer {
  private input: string;
  private pos: number;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
    this.pos = 0;
  }

  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;

    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const token = this.nextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    this.tokens.push({
      type: 'eof',
      value: '',
      start: this.pos,
      end: this.pos
    });

    return this.tokens;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private peek(offset: number = 0): string {
    return this.input[this.pos + offset] || '';
  }

  private advance(): string {
    return this.input[this.pos++] || '';
  }

  private nextToken(): Token | null {
    const start = this.pos;
    const ch = this.peek();

    // Numbers
    if (/\d/.test(ch)) {
      return this.readNumber(start);
    }

    // Strings
    if (ch === '"' || ch === "'") {
      return this.readString(start, ch);
    }

    // Identifiers and keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      return this.readIdentifier(start);
    }

    // Operators and punctuation
    if (ch === '.') {
      this.advance();
      // Check for optional chaining ?.
      if (this.peek() === '.' && this.peek(1) === '.') {
        this.advance();
        this.advance();
        return { type: 'operator', value: '...', start, end: this.pos };
      }
      return { type: 'dot', value: '.', start, end: this.pos };
    }

    if (ch === '?') {
      this.advance();
      // Check for optional chaining ?.
      if (this.peek() === '.') {
        this.advance();
        return { type: 'optional-chain', value: '?.', start, end: this.pos };
      }
      return { type: 'question', value: '?', start, end: this.pos };
    }

    if (ch === ':') {
      this.advance();
      return { type: 'colon', value: ':', start, end: this.pos };
    }

    if (ch === ',') {
      this.advance();
      return { type: 'comma', value: ',', start, end: this.pos };
    }

    if (ch === '(') {
      this.advance();
      return { type: 'lparen', value: '(', start, end: this.pos };
    }

    if (ch === ')') {
      this.advance();
      return { type: 'rparen', value: ')', start, end: this.pos };
    }

    if (ch === '[') {
      this.advance();
      return { type: 'lbracket', value: '[', start, end: this.pos };
    }

    if (ch === ']') {
      this.advance();
      return { type: 'rbracket', value: ']', start, end: this.pos };
    }

    // Operators
    const op = this.readOperator(start);
    if (op) {
      return op;
    }

    // Unknown character - error
    this.advance();
    return { type: 'error', value: ch, start, end: this.pos };
  }

  private readNumber(start: number): Token {
    let value = '';
    let hasDot = false;

    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (/\d/.test(ch)) {
        value += this.advance();
      } else if (ch === '.' && !hasDot && /\d/.test(this.peek(1))) {
        hasDot = true;
        value += this.advance();
      } else {
        break;
      }
    }

    return { type: 'number', value, start, end: this.pos };
  }

  private readString(start: number, quote: string): Token {
    let value = '';
    this.advance(); // skip opening quote

    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch === quote) {
        this.advance(); // skip closing quote
        return { type: 'string', value, start, end: this.pos };
      } else if (ch === '\\') {
        this.advance();
        const escaped = this.advance();
        // Simple escape handling
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case quote: value += quote; break;
          default: value += escaped;
        }
      } else {
        value += this.advance();
      }
    }

    // Unterminated string
    return { type: 'error', value: 'Unterminated string', start, end: this.pos };
  }

  private readIdentifier(start: number): Token {
    let value = '';

    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (/[a-zA-Z0-9_$]/.test(ch)) {
        value += this.advance();
      } else {
        break;
      }
    }

    // Check for keywords
    switch (value) {
      case 'true':
        return { type: 'true', value, start, end: this.pos };
      case 'false':
        return { type: 'false', value, start, end: this.pos };
      case 'null':
        return { type: 'null', value, start, end: this.pos };
      case 'undefined':
        return { type: 'undefined', value, start, end: this.pos };
      default:
        return { type: 'identifier', value, start, end: this.pos };
    }
  }

  private readOperator(start: number): Token | null {
    const ch = this.peek();
    const ch2 = this.peek(1);
    const ch3 = this.peek(2);

    // Three-character operators
    if (ch === '=' && ch2 === '=' && ch3 === '=') {
      this.advance();
      this.advance();
      this.advance();
      return { type: 'operator', value: '===', start, end: this.pos };
    }

    if (ch === '!' && ch2 === '=' && ch3 === '=') {
      this.advance();
      this.advance();
      this.advance();
      return { type: 'operator', value: '!==', start, end: this.pos };
    }

    // Two-character operators
    if (ch === '=' && ch2 === '=') {
      this.advance();
      this.advance();
      return { type: 'operator', value: '==', start, end: this.pos };
    }

    if (ch === '!' && ch2 === '=') {
      this.advance();
      this.advance();
      return { type: 'operator', value: '!=', start, end: this.pos };
    }

    if (ch === '<' && ch2 === '=') {
      this.advance();
      this.advance();
      return { type: 'operator', value: '<=', start, end: this.pos };
    }

    if (ch === '>' && ch2 === '=') {
      this.advance();
      this.advance();
      return { type: 'operator', value: '>=', start, end: this.pos };
    }

    if (ch === '&' && ch2 === '&') {
      this.advance();
      this.advance();
      return { type: 'operator', value: '&&', start, end: this.pos };
    }

    if (ch === '|' && ch2 === '|') {
      this.advance();
      this.advance();
      return { type: 'operator', value: '||', start, end: this.pos };
    }

    // Single-character operators
    if ('+-*/%<>!'.includes(ch)) {
      this.advance();
      return { type: 'operator', value: ch, start, end: this.pos };
    }

    return null;
  }
}
