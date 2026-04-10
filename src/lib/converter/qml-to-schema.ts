import { QmlNode } from '../qml/qml-ast';
import {
  ConversionDiagnostic,
  UiButtonNode,
  UiContainerNode,
  UiDocument,
  UiInputNode,
  UiNode,
  UiTextNode,
  UiUnsupportedNode
} from '../schema/ui-schema';

export function qmlToUiDocument(root: QmlNode): UiDocument {
  const diagnostics: ConversionDiagnostic[] = [];
  const convertedRoot = convertNode(root, diagnostics, '$');

  return {
    version: '1.0',
    root: convertedRoot,
    diagnostics
  };
}

function convertNode(node: QmlNode, diagnostics: ConversionDiagnostic[], path: string): UiNode {
  switch (node.type) {
    case 'Column':
      return convertContainer('column', node, diagnostics, path);
    case 'Row':
      return convertContainer('row', node, diagnostics, path);
    case 'Text':
      return convertText(node);
    case 'TextField':
      return convertInput(node);
    case 'Button':
      return convertButton(node);
    default:
      diagnostics.push({
        level: 'warning',
        code: 'UNSUPPORTED_QML_TYPE',
        message: `Unsupported QML node '${node.type}' was preserved as an unsupported placeholder.`,
        path
      });
      return unsupported(node, `No mapping has been implemented for '${node.type}'.`);
  }
}

function convertContainer(
  layout: UiContainerNode['layout'],
  node: QmlNode,
  diagnostics: ConversionDiagnostic[],
  path: string
): UiContainerNode {
  return {
    kind: 'container',
    layout,
    spacing: node.properties.spacing ? Number(node.properties.spacing) : undefined,
    children: node.children.map((child, index) => convertNode(child, diagnostics, `${path}.${node.type}[${index}]`))
  };
}

function convertText(node: QmlNode): UiTextNode {
  return {
    kind: 'text',
    text: node.properties.text ?? '',
    role: 'title'
  };
}

function convertInput(node: QmlNode): UiInputNode {
  return {
    kind: 'input',
    inputType: 'text',
    placeholder: node.properties.placeholderText,
    label: node.properties.placeholderText
  };
}

function convertButton(node: QmlNode): UiButtonNode {
  return {
    kind: 'button',
    text: node.properties.text ?? 'Button',
    variant: 'raised'
  };
}

function unsupported(node: QmlNode, reason: string): UiUnsupportedNode {
  return {
    kind: 'unsupported',
    qmlType: node.type,
    reason,
    raw: JSON.stringify(node)
  };
}
