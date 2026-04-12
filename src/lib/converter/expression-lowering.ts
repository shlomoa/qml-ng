import { UiBinding } from '../schema/ui-schema';
import { ExpressionParser } from '../qml/expression-parser';
import {
  extractDependencies,
  generateAngularExpression,
  isSimpleLiteral,
  getLiteralValue
} from '../qml/expression-analysis';

export interface LoweredExpression {
  binding: UiBinding;
  angularExpression: string;
}

/**
 * Lower a QML binding value to Angular
 *
 * This function now uses a proper expression AST instead of regex-based parsing.
 * It supports:
 * - Literals (strings, numbers, booleans)
 * - Identifiers and member access (user.name)
 * - Function calls (Math.max(a, b))
 * - Binary operators (+, -, *, /, &&, ||, etc.)
 * - Unary operators (!, -, +)
 * - Conditional expressions (a ? b : c)
 * - Optional chaining (user?.name)
 */
export function lowerBinding(raw: string | number | boolean): LoweredExpression {
  // Handle non-string values as literals
  if (typeof raw !== 'string') {
    return {
      binding: { kind: 'literal', value: raw, dependencies: [] },
      angularExpression: JSON.stringify(raw)
    };
  }

  const trimmed = raw.trim();

  // Handle quoted string literals
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));

  if (quoted) {
    const unquoted = trimmed.slice(1, -1);
    return {
      binding: { kind: 'literal', value: unquoted, dependencies: [] },
      angularExpression: JSON.stringify(unquoted)
    };
  }

  // Parse as expression using the full AST parser.
  // This correctly distinguishes bare identifiers (signal reads like `label`)
  // from literal values, and handles all operators and function calls.
  const parser = new ExpressionParser();
  const result = parser.parse(trimmed);

  if (!result.ast || result.errors.length > 0) {
    // If parsing failed, fall back to treating it as a literal or expression string
    // This preserves backward compatibility
    return {
      binding: {
        kind: 'expression',
        expression: trimmed,
        dependencies: []
      },
      angularExpression: trimmed
    };
  }

  // Check if the parsed result is a simple literal
  if (isSimpleLiteral(result.ast)) {
    const value = getLiteralValue(result.ast);
    return {
      binding: { kind: 'literal', value: value ?? trimmed, dependencies: [] },
      angularExpression: typeof value === 'string' ? JSON.stringify(value) : String(value)
    };
  }

  // Extract dependencies from the AST
  const depInfo = extractDependencies(result.ast);
  const dependencies = Array.from(depInfo.identifiers);

  // Generate Angular expression with signal reads
  const angularExpression = generateAngularExpression(result.ast, depInfo.identifiers);

  return {
    binding: {
      kind: 'expression',
      expression: trimmed,
      dependencies
    },
    angularExpression
  };
}
