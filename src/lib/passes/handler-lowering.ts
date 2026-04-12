import { UiNode, UiEvent } from '../schema/ui-schema';
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

  private static readonly QML_TO_ANGULAR_EVENT: Record<string, string> = {
    onClicked: 'click',
    onTextChanged: 'input',
    onPressed: 'mousedown',
    onReleased: 'mouseup',
    onDoubleClicked: 'dblclick'
  };

  transform(node: UiNode, context: PassContext): UiNode {
    // Process current node's events
    const processedEvents = node.events.map(event => this.processEvent(event));

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
  private processEvent(event: UiEvent): UiEvent {
    const angularEvent = HandlerLoweringPass.QML_TO_ANGULAR_EVENT[event.name] ?? event.angularEvent;
    return {
      ...event,
      angularEvent
    };
  }

  /**
   * Maps a QML handler name and body to a UiEvent.
   */
  static mapQmlHandler(name: string, handler: string): UiEvent {
    return {
      name,
      angularEvent: HandlerLoweringPass.QML_TO_ANGULAR_EVENT[name] ?? name,
      handler
    };
  }

  /**
   * Checks if a property name is a QML event handler (starts with 'on' followed by uppercase).
   */
  static isQmlHandlerName(name: string): boolean {
    return /^on[A-Z]/.test(name);
  }
}
