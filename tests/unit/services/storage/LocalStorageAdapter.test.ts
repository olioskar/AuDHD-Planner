/**
 * LocalStorageAdapter tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageAdapter } from '@/services/storage/LocalStorageAdapter';
import { StorageError, StorageErrorCode } from '@/services/storage/IStorageAdapter';

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  let mockStorage: Storage;

  beforeEach(() => {
    // Create mock storage
    const store: Record<string, string> = {};
    mockStorage = {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    } as Storage;

    adapter = new LocalStorageAdapter('test', mockStorage);
  });

  describe('constructor', () => {
    it('should create adapter with namespace', () => {
      expect(adapter).toBeInstanceOf(LocalStorageAdapter);
    });

    it('should throw if localStorage not available', () => {
      expect(() => {
        new LocalStorageAdapter('test', null as any);
      }).toThrow(StorageError);
    });
  });

  describe('save()', () => {
    it('should save data to storage', async () => {
      await adapter.save('key1', { value: 123 });

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'test:key1',
        JSON.stringify({ value: 123 })
      );
    });

    it('should save different data types', async () => {
      await adapter.save('string', 'hello');
      await adapter.save('number', 42);
      await adapter.save('boolean', true);
      await adapter.save('array', [1, 2, 3]);
      await adapter.save('object', { a: 1 });

      expect(mockStorage.setItem).toHaveBeenCalledTimes(5);
    });

    it('should throw StorageError on quota exceeded', async () => {
      vi.mocked(mockStorage.setItem).mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      await expect(adapter.save('key1', { value: 123 })).rejects.toThrow(StorageError);
      await expect(adapter.save('key1', { value: 123 })).rejects.toThrow(/quota exceeded/i);
    });
  });

  describe('load()', () => {
    it('should load data from storage', async () => {
      await adapter.save('key1', { value: 123 });
      const data = await adapter.load<{ value: number }>('key1');

      expect(data).toEqual({ value: 123 });
    });

    it('should return null for non-existent key', async () => {
      const data = await adapter.load('non-existent');

      expect(data).toBeNull();
    });

    it('should throw StorageError on parse error', async () => {
      vi.mocked(mockStorage.getItem).mockReturnValue('invalid json{');

      await expect(adapter.load('key1')).rejects.toThrow(StorageError);
      await expect(adapter.load('key1')).rejects.toThrow(/parse/i);
    });
  });

  describe('remove()', () => {
    it('should remove data from storage', async () => {
      await adapter.save('key1', { value: 123 });
      await adapter.remove('key1');

      const data = await adapter.load('key1');
      expect(data).toBeNull();
    });

    it('should call removeItem with namespaced key', async () => {
      await adapter.remove('key1');

      expect(mockStorage.removeItem).toHaveBeenCalledWith('test:key1');
    });
  });

  describe('clear()', () => {
    it('should clear all data with namespace', async () => {
      await adapter.save('key1', { value: 1 });
      await adapter.save('key2', { value: 2 });

      await adapter.clear();

      expect(await adapter.load('key1')).toBeNull();
      expect(await adapter.load('key2')).toBeNull();
    });
  });

  describe('has()', () => {
    it('should return true for existing key', async () => {
      await adapter.save('key1', { value: 123 });

      expect(await adapter.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await adapter.has('non-existent')).toBe(false);
    });
  });

  describe('keys()', () => {
    it('should return all keys in namespace', async () => {
      await adapter.save('key1', 1);
      await adapter.save('key2', 2);
      await adapter.save('key3', 3);

      const keys = await adapter.keys();

      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys).toHaveLength(3);
    });

    it('should return empty array when no keys', async () => {
      const keys = await adapter.keys();

      expect(keys).toEqual([]);
    });
  });

  describe('getSize()', () => {
    it('should return size information', async () => {
      await adapter.save('key1', { value: 'hello world' });

      const size = await adapter.getSize();

      expect(size).not.toBeNull();
      expect(size?.used).toBeGreaterThan(0);
      expect(size?.available).toBeGreaterThan(0);
    });
  });

  describe('isAvailable()', () => {
    it('should return true in test environment', () => {
      expect(LocalStorageAdapter.isAvailable()).toBe(true);
    });
  });

  describe('namespace handling', () => {
    it('should isolate data by namespace', async () => {
      const adapter1 = new LocalStorageAdapter('ns1', mockStorage);
      const adapter2 = new LocalStorageAdapter('ns2', mockStorage);

      await adapter1.save('key', 'value1');
      await adapter2.save('key', 'value2');

      expect(await adapter1.load('key')).toBe('value1');
      expect(await adapter2.load('key')).toBe('value2');
    });
  });
});
