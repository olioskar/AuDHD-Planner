/**
 * Storage adapter interface
 * Defines the contract for all storage implementations
 */

/**
 * Storage adapter interface for persisting application state
 *
 * Implementations must handle:
 * - Serialization/deserialization of data
 * - Error handling for storage failures
 * - Storage quota exceeded scenarios
 *
 * @example
 * ```typescript
 * const adapter = new LocalStorageAdapter('my-app');
 * await adapter.save('user-data', { name: 'John' });
 * const data = await adapter.load('user-data');
 * ```
 */
export interface IStorageAdapter {
  /**
   * Save data to storage
   *
   * @param key - Storage key
   * @param data - Data to store (will be serialized)
   * @returns Promise that resolves when save is complete
   * @throws {StorageError} If save fails
   */
  save<T>(key: string, data: T): Promise<void>;

  /**
   * Load data from storage
   *
   * @param key - Storage key
   * @returns Promise that resolves with the data, or null if not found
   * @throws {StorageError} If load fails (parsing errors, etc.)
   */
  load<T>(key: string): Promise<T | null>;

  /**
   * Remove data from storage
   *
   * @param key - Storage key
   * @returns Promise that resolves when removal is complete
   */
  remove(key: string): Promise<void>;

  /**
   * Clear all data from storage
   *
   * @returns Promise that resolves when clear is complete
   */
  clear(): Promise<void>;

  /**
   * Check if a key exists in storage
   *
   * @param key - Storage key
   * @returns Promise that resolves to true if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Get all keys in storage
   *
   * @returns Promise that resolves with array of all keys
   */
  keys(): Promise<string[]>;

  /**
   * Get storage size information (if available)
   *
   * @returns Promise that resolves with size info, or null if not available
   */
  getSize(): Promise<{ used: number; available: number } | null>;
}

/**
 * Custom error for storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Storage error codes
 */
export enum StorageErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  PARSE_ERROR = 'PARSE_ERROR',
  WRITE_ERROR = 'WRITE_ERROR',
  READ_ERROR = 'READ_ERROR',
  UNKNOWN = 'UNKNOWN',
}
