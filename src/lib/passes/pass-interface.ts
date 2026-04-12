import { UiDocument, UiNode, UiDiagnostic } from '../schema/ui-schema';
import { QmlObjectNode } from '../qml/ast';

/**
 * Context passed through all lowering passes.
 * Contains diagnostics array that passes can append to.
 */
export interface PassContext {
  diagnostics: UiDiagnostic[];
  filePath?: string;
}

/**
 * Base interface for all lowering passes.
 * Each pass takes a UiNode and returns a transformed UiNode,
 * possibly adding diagnostics to the context.
 */
export interface LoweringPass {
  readonly name: string;
  transform(node: UiNode, context: PassContext): UiNode;
}

/**
 * Interface for passes that work on the QML AST level
 * before initial UI schema creation.
 */
export interface QmlPass {
  readonly name: string;
  transform(node: QmlObjectNode, context: PassContext): QmlObjectNode;
}

/**
 * Pipeline that executes passes in sequence.
 */
export class PassPipeline {
  private passes: LoweringPass[] = [];

  add(pass: LoweringPass): this {
    this.passes.push(pass);
    return this;
  }

  execute(node: UiNode, context: PassContext): UiNode {
    let current = node;
    for (const pass of this.passes) {
      current = pass.transform(current, context);
    }
    return current;
  }

  getPassNames(): string[] {
    return this.passes.map(p => p.name);
  }
}
