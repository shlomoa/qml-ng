import { UiNode } from '../schema/ui-schema';
import { DiagnosticsEmitter } from './renderer-contract';

function normalizeWhitespaceForComment(handler: string): string {
  return handler.replace(/\s+/g, ' ').trim();
}

export class AngularDiagnosticsEmitter implements DiagnosticsEmitter {
  renderUnsupportedNode(node: UiNode): string {
    return `<div class="qml-unsupported">Unsupported node: ${node.name ?? 'unknown'}</div>`;
  }

  renderHandlerComment(handler: string): string {
    return `// TODO(qml-ng): Translate QML handler: ${normalizeWhitespaceForComment(handler)}`;
  }
}
