import { ExpressionParser } from '../qml/expression-parser';
import { ExpressionNode } from '../qml/expression-ast';
import { UiNode, UiEvent, createDiagnostic } from '../schema/ui-schema';
import { LoweringPass, PassContext } from './pass-interface';

/**
 * Handler Lowering Pass
 *
 * Responsibilities:
 * - Map QML event handler names to Angular event names
 * - Process onClicked → (click)
 * - Process onTextChanged → (input)
 * - Process onPressed → (mousedown)
 * - Preserve handler bodies for Angular event binding
 *
 * This pass ensures all events have proper Angular event name mappings.
 */
export class HandlerLoweringPass implements LoweringPass {
  readonly name = 'handler-lowering';
  private generatedMethodCounter = 0;

  private static readonly QML_TO_ANGULAR_EVENT: Record<string, string> = {
    onClicked: 'click',
    onTextChanged: 'input',
    onPressed: 'mousedown',
    onReleased: 'mouseup',
    onDoubleClicked: 'dblclick'
  };

  transform(node: UiNode, context: PassContext): UiNode {
    // Process current node's events
    const processedEvents = node.events.map(event => this.processEvent(event, context));

    // Recursively process children
    const processedChildren = node.children.map(child => this.transform(child, context));

    return {
      ...node,
      events: processedEvents,
      children: processedChildren
    };
  }

  /**
   * Maps QML event handler name to Angular event name.
   */
  private processEvent(event: UiEvent, context: PassContext): UiEvent {
    const angularEvent = HandlerLoweringPass.QML_TO_ANGULAR_EVENT[event.name] ?? event.angularEvent;
    if (event.behavior) {
      return {
        ...event,
        angularEvent
      };
    }
    const analyzed = this.analyzeHandler(event, angularEvent, context);
    return {
      ...event,
      angularEvent,
      ...analyzed
    };
  }

  private analyzeHandler(
    event: UiEvent,
    angularEvent: string,
    context: PassContext
  ): Pick<UiEvent, 'behavior' | 'handlerModel' | 'generatedMethod'> {
    const handler = event.handler.trim();

    if (!handler) {
      context.diagnostics.push(
        createDiagnostic(
          'warning',
          'unsupported',
          `Handler '${event.name}' is empty and will be skipped.`,
          event.location,
          context.filePath,
          'EMPTY_HANDLER'
        )
      );
      return {
        behavior: 'unsupported',
        handlerModel: { kind: 'unsupported', reason: 'Empty handler body' }
      };
    }

    if (this.isCallExpression(handler)) {
      return {
        behavior: 'inline',
        handlerModel: { kind: 'call', expression: handler }
      };
    }

    const assignment = this.parseAssignment(handler);
    if (assignment) {
      const generatedMethod = {
        name: this.createGeneratedMethodName(angularEvent)
      };
      context.diagnostics.push(
        createDiagnostic(
          'info',
          'semantic',
          `Handler '${event.name}' will be emitted as generated component method '${generatedMethod.name}'.`,
          event.location,
          context.filePath,
          'HANDLER_METHOD_STUB'
        )
      );
      return {
        behavior: 'method',
        handlerModel: {
          kind: 'assignment',
          target: assignment.target,
          value: assignment.value
        },
        generatedMethod
      };
    }

    context.diagnostics.push(
      createDiagnostic(
        'warning',
        'unsupported',
        `Handler '${event.name}' uses unsupported imperative logic. Supported patterns are a single call expression or a single assignment.`,
        event.location,
        context.filePath,
        'UNSUPPORTED_HANDLER'
      )
    );

    return {
      behavior: 'unsupported',
      handlerModel: {
        kind: 'unsupported',
        reason: 'Unsupported imperative logic'
      }
    };
  }

  private createGeneratedMethodName(angularEvent: string): string {
    const normalized = angularEvent.replace(/[^A-Za-z0-9]+(.)/g, (_, char: string) => char.toUpperCase());
    const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    return `handle${capitalized}${++this.generatedMethodCounter}`;
  }

  private isCallExpression(handler: string): boolean {
    const parser = new ExpressionParser();
    const result = parser.parse(handler);
    return result.errors.length === 0 && result.ast?.kind === 'call';
  }

  private parseAssignment(handler: string): { target: string; value: string } | undefined {
    const index = this.findTopLevelAssignmentIndex(handler);
    if (index === -1) {
      return undefined;
    }

    const target = handler.slice(0, index).trim();
    const value = handler.slice(index + 1).trim();
    if (!target || !value) {
      return undefined;
    }

    const parser = new ExpressionParser();
    const targetResult = parser.parse(target);
    const valueResult = parser.parse(value);

    if (
      targetResult.errors.length > 0 ||
      valueResult.errors.length > 0 ||
      !this.isAssignmentTarget(targetResult.ast)
    ) {
      return undefined;
    }

    return { target, value };
  }

  private isAssignmentTarget(ast: ExpressionNode | null): boolean {
    return ast?.kind === 'identifier' || ast?.kind === 'memberAccess';
  }

  private findTopLevelAssignmentIndex(handler: string): number {
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let quote: '"' | "'" | undefined;

    for (let index = 0; index < handler.length; index += 1) {
      const char = handler[index];
      const previous = handler[index - 1];
      const next = handler[index + 1];

      if (quote) {
        if (char === quote && previous !== '\\') {
          quote = undefined;
        }
        continue;
      }

      if (char === '"' || char === '\'') {
        quote = char;
        continue;
      }

      if (char === '(') parenDepth += 1;
      if (char === ')') parenDepth -= 1;
      if (char === '[') bracketDepth += 1;
      if (char === ']') bracketDepth -= 1;
      if (char === '{') braceDepth += 1;
      if (char === '}') braceDepth -= 1;

      if (parenDepth !== 0 || bracketDepth !== 0 || braceDepth !== 0 || char !== '=') {
        continue;
      }

      if (previous === '=' || previous === '!' || previous === '<' || previous === '>' || next === '=') {
        continue;
      }

      return index;
    }

    return -1;
  }

  /**
   * Maps a QML handler name and body to a UiEvent.
   */
  static mapQmlHandler(name: string, handler: string, location?: UiEvent['location']): UiEvent {
    return {
      name,
      angularEvent: HandlerLoweringPass.QML_TO_ANGULAR_EVENT[name] ?? name,
      handler,
      location
    };
  }

  /**
   * Checks if a property name is a QML event handler (starts with 'on' followed by uppercase).
   */
  static isQmlHandlerName(name: string): boolean {
    return /^on[A-Z]/.test(name);
  }
}
