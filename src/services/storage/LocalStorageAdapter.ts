/**
 * LocalStorage adapter implementation
 * Persists data to browser localStorage with JSON serialization
 */

import { IStorageAdapter, StorageError, StorageErrorCode } from './IStorageAdapter';

/**
 * LocalStorage adapter for browser-based storage
 *
 * Features:
 * - Automatic JSON serialization/deserialization
 * - Quota exceeded error handling
 * - Namespace support to avoid key collisions
 *
 * @example
 * ```typescript
 * const adapter = new LocalStorageAdapter('my-app');
 * await adapter.save('settings', { theme: 'dark' });
 * const settings = await adapter.load('settings');
 * ```
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private readonly namespace: string;
  private readonly storage: Storage;

  /**
   * Create a new LocalStorageAdapter
   *
   * @param namespace - Namespace prefix for keys (default: 'app')
   * @param storage - Storage instance to use (default: window.localStorage)
   */
  constructor(namespace = 'app', storage?: Storage) {
    this.namespace = namespace;

    if (storage === null) {
      throw new StorageError(
        'localStorage is not available in this environment',
        StorageErrorCode.NOT_AVAILABLE
      );
    }

    this.storage = storage ?? (typeof window !== 'undefined' ? window.localStorage : null as any);

    if (!this.storage) {
      throw new StorageError(
        'localStorage is not available in this environment',
        StorageErrorCode.NOT_AVAILABLE
      );
    }
  }

  /**
   * Get the full key with namespace prefix
   *
   * @param key - Original key
   * @returns Namespaced key
   */
  private getFullKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  /**
   * Remove namespace prefix from key
   *
   * @param fullKey - Namespaced key
   * @returns Original key without namespace
   */
  private stripNamespace(fullKey: string): string {
    const prefix = `${this.namespace}:`;
    return fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey;
  }

  /**
   * Save data to localStorage
   *
   * @param key - Storage key
   * @param data - Data to store
   * @throws {StorageError} If quota exceeded or write fails
   */
  async save<T>(key: string, data: T): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      const fullKey = this.getFullKey(key);
      this.storage.setItem(fullKey, serialized);
    } catch (error) {
      // Check for quota exceeded error
      if (
        error instanceof Error &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        throw new StorageError(
          `Storage quota exceeded when saving key "${key}"`,
          StorageErrorCode.QUOTA_EXCEEDED,
          error
        );
      }

      throw new StorageError(
        `Failed to save data for key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        StorageErrorCode.WRITE_ERROR,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Load data from localStorage
   *
   * @param key - Storage key
   * @returns Data or null if not found
   * @throws {StorageError} If parsing fails
   */
  async load<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const serialized = this.storage.getItem(fullKey);

      if (serialized === null) {
        return null;
      }

      return JSON.parse(serialized) as T;
    } catch (error) {
      // JSON parse error
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
   * Remove data from localStorage
   *
   * @param key - Storage key
   */
  async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    this.storage.removeItem(fullKey);
  }

  /**
   * Clear all data with this namespace from localStorage
   */
  async clear(): Promise<void> {
    const keys = await this.keys();
    for (const key of keys) {
      await this.remove(key);
    }
  }

  /**
   * Check if a key exists in localStorage
   *
   * @param key - Storage key
   * @returns True if key exists
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return this.storage.getItem(fullKey) !== null;
  }

  /**
   * Get all keys in this namespace
   *
   * @returns Array of keys (without namespace prefix)
   */
  async keys(): Promise<string[]> {
    const allKeys: string[] = [];
    const prefix = `${this.namespace}:`;

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(prefix)) {
        allKeys.push(this.stripNamespace(key));
      }
    }

    return allKeys;
  }

  /**
   * Get storage size information
   *
   * Note: This is an approximation as browsers don't expose exact quota info
   *
   * @returns Size information or null if unavailable
   */
  async getSize(): Promise<{ used: number; available: number } | null> {
    try {
      // Calculate approximate size of stored data
      let used = 0;
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) {
          const value = this.storage.getItem(key);
          used += (key.length + (value?.length ?? 0)) * 2; // UTF-16 = 2 bytes per char
        }
      }

      // Most browsers have ~5-10MB localStorage limit
      // We'll estimate 5MB as a conservative limit
      const estimatedLimit = 5 * 1024 * 1024; // 5MB in bytes

      return {
        used,
        available: estimatedLimit - used,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if localStorage is available and working
   *
   * @returns True if localStorage is functional
   */
  static isAvailable(): boolean {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }

      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}
