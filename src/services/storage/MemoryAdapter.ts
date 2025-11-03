/**
 * In-memory storage adapter implementation
 * Useful for testing and SSR environments
 */

import { IStorageAdapter, StorageError, StorageErrorCode } from './IStorageAdapter';

/**
 * In-memory storage adapter
 *
 * Features:
 * - No persistence (data lost on reload)
 * - Useful for testing
 * - Fast synchronous operations
 * - Optional quota simulation
 *
 * @example
 * ```typescript
 * const adapter = new MemoryAdapter({ maxSize: 1024 * 1024 }); // 1MB limit
 * await adapter.save('data', { value: 123 });
 * const data = await adapter.load('data');
 * ```
 */
export class MemoryAdapter implements IStorageAdapter {
  private storage: Map<string, string>;
  private maxSize?: number;

  /**
   * Create a new MemoryAdapter
   *
   * @param options - Configuration options
   * @param options.maxSize - Maximum storage size in bytes (optional)
   */
  constructor(options: { maxSize?: number } = {}) {
    this.storage = new Map();
    this.maxSize = options.maxSize;
  }

  /**
   * Calculate current storage size
   *
   * @returns Current size in bytes
   */
  private getCurrentSize(): number {
    let size = 0;
    for (const [key, value] of this.storage.entries()) {
      size += (key.length + value.length) * 2; // UTF-16 = 2 bytes per char
    }
    return size;
  }

  /**
   * Save data to memory
   *
   * @param key - Storage key
   * @param data - Data to store
   * @throws {StorageError} If quota exceeded
   */
  async save<T>(key: string, data: T): Promise<void> {
    try {
      const serialized = JSON.stringify(data);

      // Check quota if maxSize is set
      if (this.maxSize !== undefined) {
        const currentSize = this.getCurrentSize();
        const existingValue = this.storage.get(key);
        const existingSize = existingValue ? (key.length + existingValue.length) * 2 : 0;
        const newSize = (key.length + serialized.length) * 2;
        const sizeChange = newSize - existingSize;

        if (currentSize + sizeChange > this.maxSize) {
          throw new StorageError(
            `Storage quota exceeded: ${currentSize + sizeChange} bytes > ${this.maxSize} bytes`,
            StorageErrorCode.QUOTA_EXCEEDED
          );
        }
      }

      this.storage.set(key, serialized);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }

      throw new StorageError(
        `Failed to save data for key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        StorageErrorCode.WRITE_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Load data from memory
   *
   * @param key - Storage key
   * @returns Data or null if not found
   * @throws {StorageError} If parsing fails
   */
  async load<T>(key: string): Promise<T | null> {
    try {
      const serialized = this.storage.get(key);

      if (serialized === undefined) {
        return null;
      }

      return JSON.parse(serialized) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new StorageError(
          `Failed to parse data for key "${key}": ${error.message}`,
          StorageErrorCode.PARSE_ERROR,
          error
        );
      }

      throw new StorageError(
        `Failed to load data for key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        StorageErrorCode.READ_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Remove data from memory
   *
   * @param key - Storage key
   */
  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  /**
   * Clear all data from memory
   */
  async clear(): Promise<void> {
    this.storage.clear();
  }

  /**
   * Check if a key exists in memory
   *
   * @param key - Storage key
   * @returns True if key exists
   */
  async has(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  /**
   * Get all keys in memory
   *
   * @returns Array of keys
   */
  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  /**
   * Get storage size information
   *
   * @returns Size information
   */
  async getSize(): Promise<{ used: number; available: number } | null> {
    const used = this.getCurrentSize();
    const available = this.maxSize !== undefined ? this.maxSize - used : Infinity;

    return {
      used,
      available: available === Infinity ? Number.MAX_SAFE_INTEGER : available,
    };
  }

  /**
   * Get the raw storage map (for testing/debugging)
   *
   * @returns Internal storage map
   */
  getRawStorage(): Map<string, string> {
    return this.storage;
  }

  /**
   * Create a snapshot of current storage state
   *
   * @returns Copy of storage as plain object
   */
  snapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {};
    for (const [key, value] of this.storage.entries()) {
      try {
        snapshot[key] = JSON.parse(value);
      } catch {
        snapshot[key] = value;
      }
    }
    return snapshot;
  }

  /**
   * Restore storage from a snapshot
   *
   * @param snapshot - Snapshot to restore from
   */
  async restoreFromSnapshot(snapshot: Record<string, unknown>): Promise<void> {
    await this.clear();
    for (const [key, value] of Object.entries(snapshot)) {
      await this.save(key, value);
    }
  }
}
