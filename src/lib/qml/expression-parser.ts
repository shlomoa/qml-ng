/**
 * Expression parser for QML expressions
 *
 * Parses tokenized expressions into an AST following JavaScript/QML precedence rules.
 */

import {
  ExpressionNode,
  LiteralNode,
  IdentifierNode,
  MemberAccessNode,
  CallNode,
  UnaryOpNode,
  BinaryOpNode,
  ConditionalNode,
  ArrayNode
} from './expression-ast';
import { ExpressionTokenizer, Token, TokenType } from './expression-tokenizer';

export interface ParseError {
  message: string;
  position: number;
}

export interface ParseResult {
  ast: ExpressionNode | null;
  errors: ParseError[];
}

export class ExpressionParser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private errors: ParseError[] = [];

  parse(input: string): ParseResult {
    const tokenizer = new ExpressionTokenizer(input);
    this.tokens = tokenizer.tokenize();
    this.pos = 0;
    this.errors = [];

    if (this.tokens.length === 1 && this.tokens[0].type === 'eof') {
      this.errors.push({ message: 'Empty expression', position: 0 });
      return { ast: null, errors: this.errors };
    }

    const ast = this.parseExpression();

    if (this.current().type !== 'eof') {
      this.errors.push({
        message: `Unexpected token: ${this.current().value}`,
        position: this.current().start
      });
    }

    return { ast, errors: this.errors };
  }

  private current(): Token {
    return this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
  }

  private peek(offset: number = 1): Token {
    return this.tokens[this.pos + offset] || this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    const token = this.current();
    if (this.pos < this.tokens.length - 1) {
      this.pos++;
    }
    return token;
  }

  private expect(type: TokenType): Token | null {
    if (this.current().type === type) {
      return this.advance();
    }
    this.errors.push({
      message: `Expected ${type}, got ${this.current().type}`,
      position: this.current().start
    });
    return null;
  }

  // Expression precedence levels (lowest to highest):
  // 1. Conditional (?:)
  // 2. Logical OR (||)
  // 3. Logical AND (&&)
  // 4. Equality (==, !=, ===, !==)
  // 5. Relational (<, >, <=, >=)
  // 6. Additive (+, -)
  // 7. Multiplicative (*, /, %)
  // 8. Unary (!, -, +, typeof)
  // 9. Postfix (., ?., [], ())

  private parseExpression(): ExpressionNode | null {
    return this.parseConditional();
  }

  private parseConditional(): ExpressionNode | null {
    let node = this.parseLogicalOr();
    if (!node) return null;

    if (this.current().type === 'question') {
      this.advance();
      const consequent = this.parseExpression();
      if (!consequent) {
        this.errors.push({
          message: 'Expected expression after ?',
          position: this.current().start
        });
        return node;
      }

      if (!this.expect('colon')) {
        return node;
      }

      const alternate = this.parseExpression();
      if (!alternate) {
        this.errors.push({
          message: 'Expected expression after :',
          position: this.current().start
        });
        return node;
      }

      const conditional: ConditionalNode = {
        kind: 'conditional',
        test: node,
        consequent,
        alternate,
        location: { start: node.location?.start || 0, end: alternate.location?.end || 0 }
      };
      return conditional;
    }

    return node;
  }

  private parseLogicalOr(): ExpressionNode | null {
    return this.parseBinaryOp(
      () => this.parseLogicalAnd(),
      ['||']
    );
  }

  private parseLogicalAnd(): ExpressionNode | null {
    return this.parseBinaryOp(
      () => this.parseEquality(),
      ['&&']
    );
  }

  private parseEquality(): ExpressionNode | null {
    return this.parseBinaryOp(
      () => this.parseRelational(),
      ['==', '!=', '===', '!==']
    );
  }

  private parseRelational(): ExpressionNode | null {
    return this.parseBinaryOp(
      () => this.parseAdditive(),
      ['<', '>', '<=', '>=']
    );
  }

  private parseAdditive(): ExpressionNode | null {
    return this.parseBinaryOp(
      () => this.parseMultiplicative(),
      ['+', '-']
    );
  }

  private parseMultiplicative(): ExpressionNode | null {
    return this.parseBinaryOp(
      () => this.parseUnary(),
      ['*', '/', '%']
    );
  }

  private parseBinaryOp(
    parseNext: () => ExpressionNode | null,
    operators: string[]
  ): ExpressionNode | null {
    let left = parseNext();
    if (!left) return null;

    while (
      this.current().type === 'operator' &&
      operators.includes(this.current().value)
    ) {
      const op = this.advance();
      const right = parseNext();
      if (!right) {
        this.errors.push({
          message: `Expected expression after ${op.value}`,
          position: this.current().start
        });
        return left;
      }

      const binary: BinaryOpNode = {
        kind: 'binaryOp',
        operator: op.value as BinaryOpNode['operator'],
        left,
        right,
        location: {
          start: left.location?.start || 0,
          end: right.location?.end || 0
        }
      };
      left = binary;
    }

    return left;
  }

  private parseUnary(): ExpressionNode | null {
    if (this.current().type === 'operator') {
      const op = this.current().value;
      if (op === '!' || op === '-' || op === '+') {
        const token = this.advance();
        const argument = this.parseUnary();
        if (!argument) {
          this.errors.push({
            message: `Expected expression after ${op}`,
            position: this.current().start
          });
          return null;
        }

        const unary: UnaryOpNode = {
          kind: 'unaryOp',
          operator: op as UnaryOpNode['operator'],
          argument,
          location: { start: token.start, end: argument.location?.end || 0 }
        };
        return unary;
      }
    }

    // typeof is a special case
    if (this.current().type === 'identifier' && this.current().value === 'typeof') {
      const token = this.advance();
      const argument = this.parseUnary();
      if (!argument) {
        this.errors.push({
          message: 'Expected expression after typeof',
          position: this.current().start
        });
        return null;
      }

      const unary: UnaryOpNode = {
        kind: 'unaryOp',
        operator: 'typeof',
        argument,
        location: { start: token.start, end: argument.location?.end || 0 }
      };
      return unary;
    }

    return this.parsePostfix();
  }

  private parsePostfix(): ExpressionNode | null {
    let node = this.parsePrimary();
    if (!node) return null;

    while (true) {
      // Member access: obj.prop
      if (this.current().type === 'dot') {
        this.advance();
        const prop = this.expect('identifier');
        if (!prop) {
          this.errors.push({
            message: 'Expected property name after .',
            position: this.current().start
          });
          return node;
        }

        const member: MemberAccessNode = {
          kind: 'memberAccess',
          object: node,
          property: prop.value,
          optional: false,
          location: { start: node.location?.start || 0, end: prop.end }
        };
        node = member;
      }
      // Optional chaining: obj?.prop
      else if (this.current().type === 'optional-chain') {
        this.advance();
        const prop = this.expect('identifier');
        if (!prop) {
          this.errors.push({
            message: 'Expected property name after ?.',
            position: this.current().start
          });
          return node;
        }

        const member: MemberAccessNode = {
          kind: 'memberAccess',
          object: node,
          property: prop.value,
          optional: true,
          location: { start: node.location?.start || 0, end: prop.end }
        };
        node = member;
      }
      // Function call: func(args)
      else if (this.current().type === 'lparen') {
        this.advance();
        const args: ExpressionNode[] = [];

        while (this.current().type !== 'rparen' && this.current().type !== 'eof') {
          const arg = this.parseExpression();
          if (arg) {
            args.push(arg);
          }

          if (this.current().type === 'comma') {
            this.advance();
          } else if (this.current().type !== 'rparen') {
            this.errors.push({
              message: 'Expected , or ) in argument list',
              position: this.current().start
            });
            break;
          }
        }

        const rparen = this.expect('rparen');
        const call: CallNode = {
          kind: 'call',
          callee: node,
          arguments: args,
          location: { start: node.location?.start || 0, end: rparen?.end || this.current().start }
        };
        node = call;
      }
      // Array access: arr[index] (not implemented yet, but structure is ready)
      else if (this.current().type === 'lbracket') {
        // For now, skip this - would need proper implementation
        this.errors.push({
          message: 'Array indexing not yet supported',
          position: this.current().start
        });
        return node;
      } else {
        break;
      }
    }

    return node;
  }

  private parsePrimary(): ExpressionNode | null {
    const token = this.current();

    // Literals
    if (token.type === 'number') {
      this.advance();
      const literal: LiteralNode = {
        kind: 'literal',
        valueType: 'number',
        value: parseFloat(token.value),
        location: { start: token.start, end: token.end }
      };
      return literal;
    }

    if (token.type === 'string') {
      this.advance();
      const literal: LiteralNode = {
        kind: 'literal',
        valueType: 'string',
        value: token.value,
        location: { start: token.start, end: token.end }
      };
      return literal;
    }

    if (token.type === 'true') {
      this.advance();
      const literal: LiteralNode = {
        kind: 'literal',
        valueType: 'boolean',
        value: true,
        location: { start: token.start, end: token.end }
      };
      return literal;
    }

    if (token.type === 'false') {
      this.advance();
      const literal: LiteralNode = {
        kind: 'literal',
        valueType: 'boolean',
        value: false,
        location: { start: token.start, end: token.end }
      };
      return literal;
    }

    if (token.type === 'null') {
      this.advance();
      const literal: LiteralNode = {
        kind: 'literal',
        valueType: 'null',
        value: null,
        location: { start: token.start, end: token.end }
      };
      return literal;
    }

    if (token.type === 'undefined') {
      this.advance();
      const literal: LiteralNode = {
        kind: 'literal',
        valueType: 'null',
        value: null, // treat undefined as null
        location: { start: token.start, end: token.end }
      };
      return literal;
    }

    // Identifiers
    if (token.type === 'identifier') {
      this.advance();
      const identifier: IdentifierNode = {
        kind: 'identifier',
        name: token.value,
        location: { start: token.start, end: token.end }
      };
      return identifier;
    }

    // Parenthesized expressions
    if (token.type === 'lparen') {
      this.advance();
      const expr = this.parseExpression();
      this.expect('rparen');
      return expr;
    }

    // Array literals
    if (token.type === 'lbracket') {
      return this.parseArrayLiteral();
    }

    this.errors.push({
      message: `Unexpected token: ${token.type}`,
      position: token.start
    });
    return null;
  }

  private parseArrayLiteral(): ArrayNode | null {
    const start = this.current().start;
    this.advance(); // skip [

    const elements: ExpressionNode[] = [];

    while (this.current().type !== 'rbracket' && this.current().type !== 'eof') {
      const element = this.parseExpression();
      if (element) {
        elements.push(element);
      }

      if (this.current().type === 'comma') {
        this.advance();
      } else if (this.current().type !== 'rbracket') {
        this.errors.push({
          message: 'Expected , or ] in array literal',
          position: this.current().start
        });
        break;
      }
    }

    const rbracket = this.expect('rbracket');
    const array: ArrayNode = {
      kind: 'array',
      elements,
      location: { start, end: rbracket?.end || this.current().start }
    };
    return array;
  }
}
