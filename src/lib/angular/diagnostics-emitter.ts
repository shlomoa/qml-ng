import { UiNode } from '../schema/ui-schema';
import { DiagnosticsEmitter } from './renderer-contract';

function normalizeWhitespaceForComment(handler: string): string {
  return handler.replace(/\s+/g, ' ').trim();
}

function normalizeCommentText(text: string): string {
  return text.replace(/--/g, '—').trim();
}

export class AngularDiagnosticsEmitter implements DiagnosticsEmitter {
  renderUnsupportedNode(node: UiNode): string {
    return [
      `<!-- qml-ng approximation: unsupported QML type '${normalizeCommentText(node.name ?? 'unknown')}' rendered as a placeholder. -->`,
      `<div class="qml-unsupported">Unsupported node: ${node.name ?? 'unknown'}</div>`
    ].join('\n');
  }

  renderHandlerComment(handler: string): string {
    return `// TODO(qml-ng): Translate QML handler: ${normalizeWhitespaceForComment(handler)}`;
  }
}
