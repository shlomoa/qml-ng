/**
 * Path adapters for boundary operations.
 *
 * This module provides thin adapters that isolate `node:path` and `node:fs`
 * usage to the boundary of the system. These adapters translate between
 * workspace-aware concepts and raw filesystem operations.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * File system operations adapter
 *
 * Provides a thin layer over `node:fs` operations for reading QML source files
 * at the CLI boundary.
 */
export class FileSystemAdapter {
  /**
   * Read a QML source file from disk
   */
  readQmlFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Check if a file exists
   */
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  }

  /**
   * Check if a directory exists
   */
  directoryExists(dirPath: string): boolean {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  }

  /**
   * List files in a directory
   */
  listDirectory(dirPath: string): Array<{ name: string; isFile: boolean; isDirectory: boolean }> {
    return fs.readdirSync(dirPath, { withFileTypes: true }).map(entry => ({
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
    }));
  }
}

/**
 * Path operations adapter
 *
 * Provides utilities for converting between workspace-relative paths
 * and absolute filesystem paths at the boundary.
 */
export class PathAdapter {
  /**
   * Extract the component name from a file path
   * This is used at the CLI boundary to derive a default component name
   */
  extractComponentName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  /**
   * Get the directory containing a file
   */
  getDirectory(filePath: string): string {
    return path.dirname(filePath);
  }

  /**
   * Normalize a filesystem path
   */
  normalize(filePath: string): string {
    return path.normalize(filePath);
  }

  /**
   * Join path segments (for filesystem operations only)
   */
  join(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Resolve a path to an absolute path
   */
  resolve(...segments: string[]): string {
    return path.resolve(...segments);
  }

  /**
   * Check if a path is absolute
   */
  isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }
}

/**
 * QML file resolution adapter
 *
 * Handles QML component file discovery at the filesystem boundary.
 * This adapter understands QML naming conventions (.qml, .ui.qml) and
 * performs directory traversal when needed.
 */
export class QmlFileAdapter {
  constructor(
    private fs: FileSystemAdapter = new FileSystemAdapter(),
    private path: PathAdapter = new PathAdapter()
  ) {}

  /**
   * Find candidate QML files for a type name
   */
  findQmlFiles(typeName: string, searchDirectory: string): string[] {
    const candidates = [`${typeName}.qml`, `${typeName}.ui.qml`];
    const found: string[] = [];

    for (const candidate of candidates) {
      const fullPath = this.path.join(searchDirectory, candidate);
      if (this.fs.fileExists(fullPath)) {
        found.push(this.path.normalize(fullPath));
      }
    }

    return found;
  }

  /**
   * Recursively search for QML files in a directory tree
   */
  searchQmlFilesRecursive(rootDir: string, targetNames: Set<string>): string[] {
    const results: string[] = [];
    const seen = new Set<string>();

    const search = (dir: string) => {
      const entries = this.fs.listDirectory(dir);

      for (const entry of entries) {
        const fullPath = this.path.join(dir, entry.name);

        if (entry.isDirectory) {
          search(fullPath);
        } else if (entry.isFile && targetNames.has(entry.name)) {
          const normalized = this.path.normalize(fullPath);
          if (!seen.has(normalized)) {
            seen.add(normalized);
            results.push(normalized);
          }
        }
      }
    };

    search(rootDir);
    return results;
  }

  /**
   * Resolve a QML type to a file path
   *
   * Searches in the following order:
   * 1. Same directory as the referencing file
   * 2. Additional search roots
   */
  resolveQmlType(
    typeName: string,
    options: {
      referencingFile?: string;
      searchRoots?: string[];
    } = {}
  ): string | undefined {
    const candidates: string[] = [];
    const seen = new Set<string>();

    const addCandidate = (candidate: string) => {
      const normalized = this.path.normalize(candidate);
      if (seen.has(normalized)) {
        return;
      }
      if (this.fs.fileExists(normalized)) {
        seen.add(normalized);
        candidates.push(normalized);
      }
    };

    // Search relative to referencing file
    if (options.referencingFile) {
      const dir = this.path.getDirectory(options.referencingFile);
      const files = this.findQmlFiles(typeName, dir);
      files.forEach(addCandidate);
    }

    // Search in additional search roots
    if (options.searchRoots) {
      for (const root of options.searchRoots) {
        const files = this.findQmlFiles(typeName, root);
        files.forEach(addCandidate);
      }
    }

    // Return the first candidate found
    return candidates[0];
  }
}
