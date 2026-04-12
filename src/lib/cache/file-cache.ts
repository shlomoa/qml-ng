/**
 * File-based caching for incremental regeneration and AST/schema reuse.
 * Provides hash-based change detection and persistent storage.
 */

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { QmlDocument } from '../qml/ast';
import type { UiDocument } from '../schema/ui-schema';

export interface CacheEntry {
  sourceHash: string;
  timestamp: number;
  ast?: QmlDocument;
  document?: UiDocument;
}

export interface CacheOptions {
  cacheDir?: string;
  enabled?: boolean;
}

/**
 * Compute SHA-256 hash of file content for change detection
 */
export function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Compute hash of string content
 */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * File cache for incremental regeneration and AST/schema persistence
 */
export class FileCache {
  private cacheDir: string;
  private enabled: boolean;
  private memoryCache: Map<string, CacheEntry>;

  constructor(options: CacheOptions = {}) {
    this.cacheDir = options.cacheDir ?? path.join(process.cwd(), '.qml-ng-cache');
    this.enabled = options.enabled ?? true;
    this.memoryCache = new Map();

    if (this.enabled && !fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Get cache key for a file path
   */
  private getCacheKey(filePath: string): string {
    return crypto.createHash('md5').update(filePath).digest('hex');
  }

  /**
   * Get cache file path for a source file
   */
  private getCacheFilePath(filePath: string): string {
    const key = this.getCacheKey(filePath);
    return path.join(this.cacheDir, `${key}.json`);
  }

  /**
   * Check if file has changed since last processing
   */
  hasChanged(filePath: string): boolean {
    if (!this.enabled || !fs.existsSync(filePath)) {
      return true;
    }

    const currentHash = hashFile(filePath);
    const cached = this.get(filePath);

    return !cached || cached.sourceHash !== currentHash;
  }

  /**
   * Get cached entry for a file
   */
  get(filePath: string): CacheEntry | undefined {
    if (!this.enabled) {
      return undefined;
    }

    // Check memory cache first
    const memoryCached = this.memoryCache.get(filePath);
    if (memoryCached) {
      return memoryCached;
    }

    // Check disk cache
    const cacheFile = this.getCacheFilePath(filePath);
    if (!fs.existsSync(cacheFile)) {
      return undefined;
    }

    try {
      const content = fs.readFileSync(cacheFile, 'utf8');
      const entry: CacheEntry = JSON.parse(content);

      // Store in memory cache for faster subsequent access
      this.memoryCache.set(filePath, entry);

      return entry;
    } catch (error) {
      // Invalid cache file, ignore
      return undefined;
    }
  }

  /**
   * Store entry in cache
   */
  set(filePath: string, entry: CacheEntry): void {
    if (!this.enabled) {
      return;
    }

    // Store in memory cache
    this.memoryCache.set(filePath, entry);

    // Persist to disk
    const cacheFile = this.getCacheFilePath(filePath);
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(entry, null, 2));
    } catch (error) {
      // Ignore write errors
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.memoryCache.clear();

    if (this.enabled && fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.cacheDir, file));
        }
      }
    }
  }

  /**
   * Remove cache entry for a specific file
   */
  delete(filePath: string): void {
    this.memoryCache.delete(filePath);

    if (this.enabled) {
      const cacheFile = this.getCacheFilePath(filePath);
      if (fs.existsSync(cacheFile)) {
        fs.unlinkSync(cacheFile);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { memoryEntries: number; diskEntries: number } {
    const memoryEntries = this.memoryCache.size;

    let diskEntries = 0;
    if (this.enabled && fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      diskEntries = files.filter(f => f.endsWith('.json')).length;
    }

    return { memoryEntries, diskEntries };
  }
}
