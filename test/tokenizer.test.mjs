import assert from 'node:assert/strict';
import test from 'node:test';

import { loadBuiltModules } from './helpers.mjs';

test('tokenizer skips comments and preserves token locations', async () => {
  const { tokenizeQml } = await loadBuiltModules();
  const tokens = tokenizeQml(`// heading comment
Item {
  /* block comment */
  Text { text: "Hello" }
}
`);

  const significantTokens = tokens
    .filter(token => token.kind !== 'newline' && token.kind !== 'eof')
    .map(token => ({ kind: token.kind, value: token.value, line: token.location.line, column: token.location.column }));

  assert.deepStrictEqual(significantTokens.slice(0, 8), [
    { kind: 'identifier', value: 'Item', line: 2, column: 1 },
    { kind: 'lbrace', value: '{', line: 2, column: 6 },
    { kind: 'identifier', value: 'Text', line: 4, column: 3 },
    { kind: 'lbrace', value: '{', line: 4, column: 8 },
    { kind: 'identifier', value: 'text', line: 4, column: 10 },
    { kind: 'colon', value: ':', line: 4, column: 14 },
    { kind: 'string', value: 'Hello', line: 4, column: 16 },
    { kind: 'rbrace', value: '}', line: 4, column: 24 }
  ]);
});
