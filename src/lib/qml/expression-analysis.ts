/**
 * Expression analysis and lowering utilities
 *
 * Extracts dependencies from expression AST and generates Angular expressions.
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

export interface DependencyInfo {
  identifiers: Set<string>;
  hasFunctionCalls: boolean;
  callees: Set<string>;
}

/**
 * Extract dependencies from an expression AST
 *
 * Returns all root identifiers that the expression depends on.
 * These will need to be available as signal reads in the generated Angular code.
 */
export function extractDependencies(ast: ExpressionNode): DependencyInfo {
  const identifiers = new Set<string>();
  const callees = new Set<string>();
  let hasFunctionCalls = false;

  function visit(node: ExpressionNode): void {
    switch (node.kind) {
      case 'literal':
        // No dependencies
        break;

      case 'identifier':
        identifiers.add(node.name);
        break;

      case 'memberAccess':
        // Only the root object is a dependency
        const root = getRootIdentifier(node.object);
        if (root) {
          identifiers.add(root);
        }
        break;

      case 'call':
        hasFunctionCalls = true;
        // Track the callee name if it's a simple identifier or member access
        const calleeName = getCalleeName(node.callee);
        if (calleeName) {
          callees.add(calleeName);
        }
        visit(node.callee);
        node.arguments.forEach(visit);
        break;

      case 'unaryOp':
        visit(node.argument);
        break;

      case 'binaryOp':
        visit(node.left);
        visit(node.right);
        break;

      case 'conditional':
        visit(node.test);
        visit(node.consequent);
        visit(node.alternate);
        break;

      case 'array':
        node.elements.forEach(visit);
        break;
    }
  }

  visit(ast);

  // Filter out blacklisted identifiers that are not actual dependencies
  const blacklist = new Set(['true', 'false', 'null', 'undefined', 'Math', 'parent']);
  for (const id of blacklist) {
    identifiers.delete(id);
  }

  return { identifiers, hasFunctionCalls, callees };
}

/**
 * Get the root identifier from an expression
 */
function getRootIdentifier(node: ExpressionNode): string | null {
  if (node.kind === 'identifier') {
    return node.name;
  }
  if (node.kind === 'memberAccess') {
    return getRootIdentifier(node.object);
  }
  return null;
}

/**
 * Get the callee name for tracking function calls
 */
function getCalleeName(node: ExpressionNode): string | null {
  if (node.kind === 'identifier') {
    return node.name;
  }
  if (node.kind === 'memberAccess') {
    // For Math.max, return 'Math.max'
    const obj = getRootIdentifier(node.object);
    if (obj) {
      return `${obj}.${node.property}`;
    }
  }
  return null;
}

/**
 * Generate Angular expression from AST
 *
 * Converts QML expression AST to Angular template expression,
 * rewriting signal dependencies as function calls.
 */
export function generateAngularExpression(
  ast: ExpressionNode,
  dependencies: Set<string>
): string {
  function generate(node: ExpressionNode): string {
    switch (node.kind) {
      case 'literal':
        return formatLiteral(node);

      case 'identifier':
        // Rewrite dependencies as signal reads: user -> user()
        if (dependencies.has(node.name)) {
          return `${node.name}()`;
        }
        return node.name;

      case 'memberAccess': {
        const obj = generate(node.object);
        const op = node.optional ? '?.' : '.';
        // Clean up double parentheses: user()() -> user()
        const cleanObj = obj.replace(/\(\)\(\)$/, '()');
        return `${cleanObj}${op}${node.property}`;
      }

      case 'call': {
        const callee = generate(node.callee);
        const args = node.arguments.map(generate).join(', ');
        return `${callee}(${args})`;
      }

      case 'unaryOp':
        return `${node.operator}${generate(node.argument)}`;

      case 'binaryOp': {
        const left = generate(node.left);
        const right = generate(node.right);
        return `${left} ${node.operator} ${right}`;
      }

      case 'conditional': {
        const test = generate(node.test);
        const consequent = generate(node.consequent);
        const alternate = generate(node.alternate);
        return `${test} ? ${consequent} : ${alternate}`;
      }

      case 'array': {
        const elements = node.elements.map(generate).join(', ');
        return `[${elements}]`;
      }
    }
  }

  return generate(ast);
}

function formatLiteral(node: LiteralNode): string {
  switch (node.valueType) {
    case 'string':
      return JSON.stringify(node.value);
    case 'number':
      return String(node.value);
    case 'boolean':
      return String(node.value);
    case 'null':
      return 'null';
  }
}

/**
 * Check if an expression is a simple literal
 */
export function isSimpleLiteral(ast: ExpressionNode | null): boolean {
  return ast !== null && ast.kind === 'literal';
}

/**
 * Get the literal value if the expression is a simple literal
 */
export function getLiteralValue(ast: ExpressionNode | null): string | number | boolean | null | undefined {
  if (ast && ast.kind === 'literal') {
    return ast.value;
  }
  return undefined;
}
