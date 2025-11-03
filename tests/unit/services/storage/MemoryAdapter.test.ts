/**
 * MemoryAdapter tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryAdapter } from '@/services/storage/MemoryAdapter';
import { StorageError, StorageErrorCode } from '@/services/storage/IStorageAdapter';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter;

  beforeEach(() => {
    adapter = new MemoryAdapter();
  });

  describe('constructor', () => {
    it('should create adapter without max size', () => {
      expect(adapter).toBeInstanceOf(MemoryAdapter);
    });

    it('should create adapter with max size', () => {
      const limitedAdapter = new MemoryAdapter({ maxSize: 1024 });
      expect(limitedAdapter).toBeInstanceOf(MemoryAdapter);
    });
  });

  describe('save()', () => {
    it('should save data to memory', async () => {
      await adapter.save('key1', { value: 123 });

      const data = await adapter.load<{ value: number }>('key1');
      expect(data).toEqual({ value: 123 });
    });

    it('should save different data types', async () => {
      await adapter.save('string', 'hello');
      await adapter.save('number', 42);
      await adapter.save('boolean', true);
      await adapter.save('array', [1, 2, 3]);
      await adapter.save('object', { a: 1 });

      expect(await adapter.load('string')).toBe('hello');
      expect(await adapter.load('number')).toBe(42);
      expect(await adapter.load('boolean')).toBe(true);
      expect(await adapter.load('array')).toEqual([1, 2, 3]);
      expect(await adapter.load('object')).toEqual({ a: 1 });
    });

    it('should overwrite existing data', async () => {
      await adapter.save('key1', 'first');
      await adapter.save('key1', 'second');

      expect(await adapter.load('key1')).toBe('second');
    });

    it('should throw on quota exceeded', async () => {
      const limitedAdapter = new MemoryAdapter({ maxSize: 100 });

      // Create data that exceeds quota
      const largeData = 'x'.repeat(1000);

      await expect(limitedAdapter.save('key1', largeData)).rejects.toThrow(StorageError);
      await expect(limitedAdapter.save('key1', largeData)).rejects.toThrow(/quota exceeded/i);
    });
  });

  describe('load()', () => {
    it('should load data from memory', async () => {
      await adapter.save('key1', { value: 123 });
      const data = await adapter.load<{ value: number }>('key1');

      expect(data).toEqual({ value: 123 });
    });

    it('should return null for non-existent key', async () => {
      const data = await adapter.load('non-existent');

      expect(data).toBeNull();
    });

    it('should handle complex objects', async () => {
      const complex = {
        nested: {
          array: [1, 2, 3],
          object: { a: 'b' },
        },
        date: new Date().toISOString(),
      };

      await adapter.save('complex', complex);
      const loaded = await adapter.load('complex');

      expect(loaded).toEqual(complex);
    });
  });

  describe('remove()', () => {
    it('should remove data from memory', async () => {
      await adapter.save('key1', { value: 123 });
      await adapter.remove('key1');

      const data = await adapter.load('key1');
      expect(data).toBeNull();
    });

    it('should not error on removing non-existent key', async () => {
      await expect(adapter.remove('non-existent')).resolves.toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should clear all data', async () => {
      await adapter.save('key1', 1);
      await adapter.save('key2', 2);
      await adapter.save('key3', 3);

      await adapter.clear();

      expect(await adapter.load('key1')).toBeNull();
      expect(await adapter.load('key2')).toBeNull();
      expect(await adapter.load('key3')).toBeNull();
    });
  });

  describe('has()', () => {
    it('should return true for existing key', async () => {
      await adapter.save('key1', 123);

      expect(await adapter.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      expect(await adapter.has('non-existent')).toBe(false);
    });
  });

  describe('keys()', () => {
    it('should return all keys', async () => {
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
    it('should return size information without limit', async () => {
      await adapter.save('key1', 'hello');

      const size = await adapter.getSize();

      expect(size).not.toBeNull();
      expect(size?.used).toBeGreaterThan(0);
      expect(size?.available).toBeGreaterThan(0);
    });

    it('should return size information with limit', async () => {
      const limitedAdapter = new MemoryAdapter({ maxSize: 1000 });
      await limitedAdapter.save('key1', 'hello');

      const size = await limitedAdapter.getSize();

      expect(size).not.toBeNull();
      expect(size?.used).toBeGreaterThan(0);
      expect(size?.available).toBeLessThan(1000);
    });
  });

  describe('getRawStorage()', () => {
    it('should return internal storage map', async () => {
      await adapter.save('key1', 'value1');

      const storage = adapter.getRawStorage();

      expect(storage).toBeInstanceOf(Map);
      expect(storage.has('key1')).toBe(true);
    });
  });

  describe('snapshot and restore', () => {
    it('should create snapshot of current state', async () => {
      await adapter.save('key1', 'value1');
      await adapter.save('key2', { nested: 'value2' });

      const snapshot = adapter.snapshot();

      expect(snapshot).toEqual({
        key1: 'value1',
        key2: { nested: 'value2' },
      });
    });

    it('should restore from snapshot', async () => {
      const snapshot = {
        key1: 'value1',
        key2: { nested: 'value2' },
        key3: [1, 2, 3],
      };

      await adapter.restoreFromSnapshot(snapshot);

      expect(await adapter.load('key1')).toBe('value1');
      expect(await adapter.load('key2')).toEqual({ nested: 'value2' });
      expect(await adapter.load('key3')).toEqual([1, 2, 3]);
    });

    it('should clear existing data when restoring', async () => {
      await adapter.save('existing', 'data');

      const snapshot = { new: 'data' };
      await adapter.restoreFromSnapshot(snapshot);

      expect(await adapter.load('existing')).toBeNull();
      expect(await adapter.load('new')).toBe('data');
    });
  });

  describe('quota management', () => {
    it('should allow saves within quota', async () => {
      const limitedAdapter = new MemoryAdapter({ maxSize: 1000 });

      await expect(limitedAdapter.save('key1', 'small data')).resolves.toBeUndefined();
    });

    it('should prevent saves exceeding quota', async () => {
      const limitedAdapter = new MemoryAdapter({ maxSize: 100 });
      const largeData = 'x'.repeat(1000);

      await expect(limitedAdapter.save('key1', largeData)).rejects.toThrow(StorageError);
    });

    it('should account for existing data when checking quota', async () => {
      const limitedAdapter = new MemoryAdapter({ maxSize: 300 });

      await limitedAdapter.save('key1', 'x'.repeat(20));
      await limitedAdapter.save('key2', 'y'.repeat(20));

      // This should fail as total would exceed quota
      await expect(limitedAdapter.save('key3', 'z'.repeat(200))).rejects.toThrow();
    });

    it('should allow updating existing key within quota', async () => {
      const limitedAdapter = new MemoryAdapter({ maxSize: 200 });

      await limitedAdapter.save('key1', 'x'.repeat(50));
      // Update same key should work even if total size is near limit
      await expect(limitedAdapter.save('key1', 'y'.repeat(50))).resolves.toBeUndefined();
    });
  });
});
