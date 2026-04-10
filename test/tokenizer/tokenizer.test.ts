import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { tokenizeQml } from '../../dist/lib/qml/tokenizer.js';

describe('Tokenizer', () => {
  describe('Basic Tokens', () => {
    test('should tokenize identifiers', () => {
      const tokens = tokenizeQml('Column Text Button');
      assert.equal(tokens.length, 4); // 3 identifiers + EOF
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[0].value, 'Column');
      assert.equal(tokens[1].kind, 'identifier');
      assert.equal(tokens[1].value, 'Text');
      assert.equal(tokens[2].kind, 'identifier');
      assert.equal(tokens[2].value, 'Button');
    });

    test('should tokenize strings with double quotes', () => {
      const tokens = tokenizeQml('"hello world"');
      assert.equal(tokens[0].kind, 'string');
      assert.equal(tokens[0].value, 'hello world');
    });

    test('should tokenize strings with single quotes', () => {
      const tokens = tokenizeQml("'hello world'");
      assert.equal(tokens[0].kind, 'string');
      assert.equal(tokens[0].value, 'hello world');
    });

    test('should handle escaped characters in strings', () => {
      const tokens = tokenizeQml('"hello\\"world"');
      assert.equal(tokens[0].kind, 'string');
      assert.equal(tokens[0].value, 'hello"world');
    });

    test('should tokenize numbers', () => {
      const tokens = tokenizeQml('123 45.67 0.5');
      assert.equal(tokens[0].kind, 'number');
      assert.equal(tokens[0].value, '123');
      assert.equal(tokens[1].kind, 'number');
      assert.equal(tokens[1].value, '45.67');
      assert.equal(tokens[2].kind, 'number');
      assert.equal(tokens[2].value, '0.5');
    });
  });

  describe('Structural Tokens', () => {
    test('should tokenize braces', () => {
      const tokens = tokenizeQml('{ }');
      assert.equal(tokens[0].kind, 'lbrace');
      assert.equal(tokens[1].kind, 'rbrace');
    });

    test('should tokenize brackets', () => {
      const tokens = tokenizeQml('[ ]');
      assert.equal(tokens[0].kind, 'lbracket');
      assert.equal(tokens[1].kind, 'rbracket');
    });

    test('should tokenize colons and commas', () => {
      const tokens = tokenizeQml(': ,');
      assert.equal(tokens[0].kind, 'colon');
      assert.equal(tokens[1].kind, 'comma');
    });

    test('should tokenize dots', () => {
      const tokens = tokenizeQml('user.name');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[0].value, 'user');
      assert.equal(tokens[1].kind, 'dot');
      assert.equal(tokens[2].kind, 'identifier');
      assert.equal(tokens[2].value, 'name');
    });

    test('should tokenize newlines', () => {
      const tokens = tokenizeQml('a\nb');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[1].kind, 'newline');
      assert.equal(tokens[2].kind, 'identifier');
    });
  });

  describe('Comments', () => {
    test('should skip single-line comments', () => {
      const tokens = tokenizeQml('a // comment\nb');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[0].value, 'a');
      assert.equal(tokens[1].kind, 'newline');
      assert.equal(tokens[2].kind, 'identifier');
      assert.equal(tokens[2].value, 'b');
    });

    test('should skip multi-line comments', () => {
      const tokens = tokenizeQml('a /* comment */ b');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[0].value, 'a');
      assert.equal(tokens[1].kind, 'identifier');
      assert.equal(tokens[1].value, 'b');
    });

    test('should handle nested comment-like content in multi-line comments', () => {
      const tokens = tokenizeQml('a /* // nested */ b');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[0].value, 'a');
      assert.equal(tokens[1].kind, 'identifier');
      assert.equal(tokens[1].value, 'b');
    });
  });

  describe('Whitespace Handling', () => {
    test('should skip spaces and tabs', () => {
      const tokens = tokenizeQml('a \t b');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[1].kind, 'identifier');
    });

    test('should skip carriage returns', () => {
      const tokens = tokenizeQml('a\r\nb');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[1].kind, 'newline');
      assert.equal(tokens[2].kind, 'identifier');
    });
  });

  describe('Position Tracking', () => {
    test('should track token positions', () => {
      const tokens = tokenizeQml('a b c');
      assert.equal(tokens[0].position, 0);
      assert.equal(tokens[1].position, 2);
      assert.equal(tokens[2].position, 4);
    });

    test('should track positions across newlines', () => {
      const tokens = tokenizeQml('a\nb');
      assert.equal(tokens[0].position, 0);
      assert.equal(tokens[1].position, 1);
      assert.equal(tokens[2].position, 2);
    });
  });

  describe('Real QML Snippets', () => {
    test('should tokenize simple property assignment', () => {
      const tokens = tokenizeQml('text: "Hello"');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[0].value, 'text');
      assert.equal(tokens[1].kind, 'colon');
      assert.equal(tokens[2].kind, 'string');
      assert.equal(tokens[2].value, 'Hello');
    });

    test('should tokenize object with properties', () => {
      const source = 'Button { text: "Click" }';
      const tokens = tokenizeQml(source);
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[0].value, 'Button');
      assert.equal(tokens[1].kind, 'lbrace');
      assert.equal(tokens[2].kind, 'identifier');
      assert.equal(tokens[2].value, 'text');
      assert.equal(tokens[3].kind, 'colon');
      assert.equal(tokens[4].kind, 'string');
      assert.equal(tokens[4].value, 'Click');
      assert.equal(tokens[5].kind, 'rbrace');
    });

    test('should tokenize dotted property access', () => {
      const tokens = tokenizeQml('anchors.centerIn: parent');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[0].value, 'anchors');
      assert.equal(tokens[1].kind, 'dot');
      assert.equal(tokens[2].kind, 'identifier');
      assert.equal(tokens[2].value, 'centerIn');
      assert.equal(tokens[3].kind, 'colon');
      assert.equal(tokens[4].kind, 'identifier');
      assert.equal(tokens[4].value, 'parent');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      const tokens = tokenizeQml('');
      assert.equal(tokens.length, 1);
      assert.equal(tokens[0].kind, 'eof');
    });

    test('should handle unclosed strings', () => {
      const tokens = tokenizeQml('"unclosed');
      assert.equal(tokens[0].kind, 'string');
      // The tokenizer should still produce a token even if unclosed
    });

    test('should handle other characters as other tokens', () => {
      const tokens = tokenizeQml('a + b');
      assert.equal(tokens[0].kind, 'identifier');
      assert.equal(tokens[1].kind, 'other');
      assert.equal(tokens[1].value, '+');
      assert.equal(tokens[2].kind, 'identifier');
    });
  });
});
