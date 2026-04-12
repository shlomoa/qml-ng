import { UiNode, UiBinding } from '../schema/ui-schema';
import { LoweringPass, PassContext } from './pass-interface';

/**
 * Binding Lowering Pass
 *
 * Responsibilities:
 * - Process text bindings (for Text nodes)
 * - Process placeholder bindings (for TextField nodes)
 * - Process source bindings (for Image nodes)
 * - Process button text bindings (for Button nodes)
 * - Extract dependencies from expressions
 * - Rewrite expressions for Angular signal syntax
 *
 * This pass converts raw property values into structured UiBinding objects
 * with proper dependency tracking and Angular-compatible expression rewriting.
 */
export class BindingLoweringPass implements LoweringPass {
  readonly name = 'binding-lowering';

  transform(node: UiNode, context: PassContext): UiNode {
    // Process current node's bindings based on kind
    let processedNode = { ...node };

    // Text binding for Text nodes
    if (node.kind === 'text' && node.text) {
      processedNode.text = this.ensureProperBinding(node.text);
    }

    // Placeholder binding for Input nodes
    if (node.kind === 'input' && node.placeholder) {
      processedNode.placeholder = this.ensureProperBinding(node.placeholder);
    }

    // Source binding for Image nodes
    if (node.kind === 'image' && node.source) {
      processedNode.source = this.ensureProperBinding(node.source);
    }

    // Text binding for Button nodes
    if (node.kind === 'button' && node.text) {
      processedNode.text = this.ensureProperBinding(node.text);
    }

    // Recursively process children
    const processedChildren = node.children.map(child => this.transform(child, context));

    return {
      ...processedNode,
      children: processedChildren
    };
  }

  /**
   * Ensures binding has proper dependency extraction and expression rewriting.
   * If binding is already properly formed, returns it as-is.
   */
  private ensureProperBinding(binding: UiBinding): UiBinding {
    if (binding.kind === 'literal') {
      return binding;
    }

    if (binding.kind === 'expression' && binding.expression) {
      // Re-extract dependencies to ensure they're up to date
      const dependencies = this.extractDependencies(binding.expression);
      return {
        ...binding,
        dependencies
      };
    }

    return binding;
  }

  /**
   * Extracts dependency identifiers from an expression.
   * Filters out common literals and extracts only root identifiers.
   */
  private extractDependencies(expression: string): string[] {
    const matches = expression.match(/[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/g) ?? [];
    const blacklist = new Set(['true', 'false', 'null', 'undefined', 'parent', 'Math']);
    const roots = matches
      .map(m => m.split('.')[0])
      .filter(m => !blacklist.has(m));
    return [...new Set(roots)];
  }

  /**
   * Rewrites expression for Angular signal syntax.
   * Dependencies that look like signals get () appended.
   */
  static rewriteForSignals(expression: string, dependencies: string[]): string {
    let rewritten = expression;
    for (const dep of dependencies) {
      const exact = new RegExp(`\\b${dep}\\b`, 'g');
      rewritten = rewritten.replace(exact, `${dep}()`);
    }
    // Clean up any ?. () artifacts
    rewritten = rewritten.replace(/\?\.()/g, '?.');
    return rewritten;
  }

  /**
   * Creates a UiBinding from a raw value (used during initial conversion).
   */
  static lowerBinding(raw: string | number | boolean): {
    binding: UiBinding;
    angularExpression: string;
  } {
    if (typeof raw !== 'string') {
      return {
        binding: { kind: 'literal', value: raw, dependencies: [] },
        angularExpression: JSON.stringify(raw)
      };
    }

    const trimmed = raw.trim();
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

    const isSimpleLiteral = /^[A-Za-z0-9 _-]+$/.test(trimmed) && !/[.()+\-/*]/.test(trimmed);
    if (isSimpleLiteral) {
      return {
        binding: { kind: 'literal', value: trimmed, dependencies: [] },
        angularExpression: JSON.stringify(trimmed)
      };
    }

    const pass = new BindingLoweringPass();
    const dependencies = pass.extractDependencies(trimmed);
    return {
      binding: {
        kind: 'expression',
        expression: trimmed,
        dependencies
      },
      angularExpression: BindingLoweringPass.rewriteForSignals(trimmed, dependencies)
    };
  }
}
