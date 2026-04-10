import * as fs from 'node:fs';
import * as path from 'node:path';
import { QmlDocument, QmlObjectNode } from './ast';
import { parseQml } from './parser';

export interface QmlParseOptions {
  filePath?: string;
  searchRoots?: string[];
}

function walkObjectTree(node: QmlObjectNode, visit: (node: QmlObjectNode) => void): void {
  visit(node);
  for (const child of node.children) {
    walkObjectTree(child, visit);
  }
  for (const property of node.properties) {
    if (property.embeddedObject) {
      walkObjectTree(property.embeddedObject, visit);
    }
  }
}

export function collectResolvedQmlDependencies(
  entryFilePath: string,
  options: QmlParseOptions = {}
): string[] {
  const visited = new Set<string>();
  const resolved = new Set<string>();
  const searchRoots = options.searchRoots ?? [];

  const visitFile = (filePath: string) => {
    const normalized = path.normalize(filePath);
    if (visited.has(normalized)) {
      return;
    }

    visited.add(normalized);
    resolved.add(normalized);

    const source = fs.readFileSync(normalized, 'utf8');
    const document: QmlDocument = parseQml(source, {
      filePath: normalized,
      searchRoots
    });

    walkObjectTree(document.root, node => {
      if (node.resolvedSourcePath) {
        visitFile(node.resolvedSourcePath);
      }
    });
  };

  visitFile(entryFilePath);
  return [...resolved].sort((left, right) => left.localeCompare(right));
}
