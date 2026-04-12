/**
 * Expression AST for QML expressions
 *
 * This module defines the AST structure for parsing QML expressions,
 * enabling proper dependency extraction and safe lowering to Angular.
 */

export interface SourceLocation {
  start: number;
  end: number;
  line?: number;
  column?: number;
}

export type ExpressionNode =
  | LiteralNode
  | IdentifierNode
  | MemberAccessNode
  | CallNode
  | UnaryOpNode
  | BinaryOpNode
  | ConditionalNode
  | ArrayNode;

export interface LiteralNode {
  kind: 'literal';
  valueType: 'string' | 'number' | 'boolean' | 'null';
  value: string | number | boolean | null;
  location?: SourceLocation;
}

export interface IdentifierNode {
  kind: 'identifier';
  name: string;
  location?: SourceLocation;
}

export interface MemberAccessNode {
  kind: 'memberAccess';
  object: ExpressionNode;
  property: string;
  optional: boolean; // for optional chaining ?.
  location?: SourceLocation;
}

export interface CallNode {
  kind: 'call';
  callee: ExpressionNode;
  arguments: ExpressionNode[];
  location?: SourceLocation;
}

export interface UnaryOpNode {
  kind: 'unaryOp';
  operator: '!' | '-' | '+' | 'typeof';
  argument: ExpressionNode;
  location?: SourceLocation;
}

export interface BinaryOpNode {
  kind: 'binaryOp';
  operator: '+' | '-' | '*' | '/' | '%' | '&&' | '||' | '==' | '!=' | '===' | '!==' | '<' | '>' | '<=' | '>=';
  left: ExpressionNode;
  right: ExpressionNode;
  location?: SourceLocation;
}

export interface ConditionalNode {
  kind: 'conditional';
  test: ExpressionNode;
  consequent: ExpressionNode;
  alternate: ExpressionNode;
  location?: SourceLocation;
}

export interface ArrayNode {
  kind: 'array';
  elements: ExpressionNode[];
  location?: SourceLocation;
}
