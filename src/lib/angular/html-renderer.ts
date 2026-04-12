import { UiNode } from '../schema/ui-schema';
import { DiagnosticsEmitter, HtmlRenderer, RenderContext } from './renderer-contract';
import { renderNodeFromRegistry } from './node-render-registry';

export class AngularHtmlRenderer implements HtmlRenderer {
  constructor(private readonly diagnosticsEmitter: DiagnosticsEmitter) {}

  render(root: UiNode, context: RenderContext): string {
    return renderNodeFromRegistry(root, context, this.diagnosticsEmitter);
  }
}
