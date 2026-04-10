import { QmlNode } from './qml-ast';

/**
 * Starter parser.
 *
 * This intentionally handles only a tiny QML subset:
 * - Type blocks: `Type { ... }`
 * - String and numeric scalar properties: `name: value`
 * - Nested child blocks
 *
 * It is not a general-purpose QML parser.
 */
export function parseQml(input: string): QmlNode {
  const tokens = tokenize(input);
  let index = 0;

  function peek(): string | undefined {
    return tokens[index];
  }

  function consume(expected?: string): string {
    const token = tokens[index++];
    if (!token) {
      throw new Error(`Unexpected end of input${expected ? `, expected ${expected}` : ''}`);
    }
    if (expected && token !== expected) {
      throw new Error(`Expected token ${expected} but got ${token}`);
    }
    return token;
  }

  function parseNode(): QmlNode {
    const type = consume();
    consume('{');

    const properties: Record<string, string> = {};
    const children: QmlNode[] = [];

    while (peek() && peek() !== '}') {
      const current = peek()!;
      const next = tokens[index + 1];

      if (next === ':') {
        const key = consume();
        consume(':');
        const value = consume();
        properties[key] = stripQuotes(value);
        continue;
      }

      if (next === '{') {
        children.push(parseNode());
        continue;
      }

      throw new Error(`Unexpected token sequence near '${current}'`);
    }

    consume('}');
    return { type, properties, children };
  }

  const root = parseNode();
  if (index !== tokens.length) {
    throw new Error('Trailing tokens after root node');
  }
  return root;
}

function tokenize(input: string): string[] {
  const noComments = input.replace(/\/\/.*$/gm, '');
  const matches = noComments.match(/"(?:\\.|[^"])*"|\{|\}|:|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?/g);
  return matches ?? [];
}

function stripQuotes(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
}
