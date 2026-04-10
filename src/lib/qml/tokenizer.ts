export type TokenKind =
  | 'identifier'
  | 'string'
  | 'number'
  | 'lbrace'
  | 'rbrace'
  | 'lbracket'
  | 'rbracket'
  | 'colon'
  | 'comma'
  | 'dot'
  | 'newline'
  | 'eof'
  | 'other';

export interface Token {
  kind: TokenKind;
  value: string;
  position: number;
}

function isAlpha(ch: string): boolean {
  return /[A-Za-z_]/.test(ch);
}

function isAlphaNum(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch);
}

function isDigit(ch: string): boolean {
  return /[0-9]/.test(ch);
}

export function tokenizeQml(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const push = (kind: TokenKind, value: string, position: number) => {
    tokens.push({ kind, value, position });
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i += 1;
      continue;
    }

    if (ch === '\n') {
      push('newline', ch, i);
      i += 1;
      continue;
    }

    if (ch === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '{') { push('lbrace', ch, i); i += 1; continue; }
    if (ch === '}') { push('rbrace', ch, i); i += 1; continue; }
    if (ch === '[') { push('lbracket', ch, i); i += 1; continue; }
    if (ch === ']') { push('rbracket', ch, i); i += 1; continue; }
    if (ch === ':') { push('colon', ch, i); i += 1; continue; }
    if (ch === ',') { push('comma', ch, i); i += 1; continue; }
    if (ch === '.') { push('dot', ch, i); i += 1; continue; }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      const start = i;
      i += 1;
      let value = '';
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < source.length) {
          value += source[i + 1];
          i += 2;
        } else {
          value += source[i];
          i += 1;
        }
      }
      i += 1;
      push('string', value, start);
      continue;
    }

    if (isDigit(ch)) {
      const start = i;
      let value = '';
      while (i < source.length && /[0-9.]/.test(source[i])) {
        value += source[i];
        i += 1;
      }
      push('number', value, start);
      continue;
    }

    if (isAlpha(ch)) {
      const start = i;
      let value = '';
      while (i < source.length && isAlphaNum(source[i])) {
        value += source[i];
        i += 1;
      }
      push('identifier', value, start);
      continue;
    }

    push('other', ch, i);
    i += 1;
  }

  push('eof', '', source.length);
  return tokens;
}
