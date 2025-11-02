/**
 * Item model tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Item } from '@models/Item';
import type { ItemData } from '@types/models';

describe('Item', () => {
  describe('constructor', () => {
    it('should create item with default values', () => {
      const item = new Item();

      expect(item.id).toBeDefined();
      expect(item.id).toMatch(/^item-\d+-[a-z0-9]+$/);
      expect(item.text).toBe('');
      expect(item.checked).toBe(false);
      expect(item.createdAt).toBeGreaterThan(0);
      expect(item.updatedAt).toBeGreaterThan(0);
      expect(item.updatedAt).toBeGreaterThanOrEqual(item.createdAt);
    });

    it('should create item with provided values', () => {
      const data: ItemData = {
        id: 'custom-id',
        text: 'Test item',
        checked: true,
        createdAt: 1000,
        updatedAt: 2000,
      };

      const item = new Item(data);

      expect(item.id).toBe('custom-id');
      expect(item.text).toBe('Test item');
      expect(item.checked).toBe(true);
      expect(item.createdAt).toBe(1000);
      expect(item.updatedAt).toBe(2000);
    });

    it('should generate unique IDs for multiple items', () => {
      const item1 = new Item();
      const item2 = new Item();

      expect(item1.id).not.toBe(item2.id);
    });

    it('should accept partial data', () => {
      const item = new Item({ text: 'Partial' });

      expect(item.id).toBeDefined();
      expect(item.text).toBe('Partial');
      expect(item.checked).toBe(false);
    });
  });

  describe('validation', () => {
    it('should validate successfully with valid data', () => {
      const item = new Item({ text: 'Valid item' });
      const result = item.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw on text longer than 500 characters', () => {
      const longText = 'x'.repeat(501);

      expect(() => {
        new Item({ text: longText });
      }).toThrow('Item text must be less than 500 characters');
    });

    it('should allow text up to 500 characters', () => {
      const maxText = 'x'.repeat(500);

      expect(() => {
        new Item({ text: maxText });
      }).not.toThrow();
    });

    it('should throw on invalid text type', () => {
      expect(() => {
        new Item({ text: 123 as any });
      }).toThrow('Item text must be a string');
    });

    it('should throw on invalid checked type', () => {
      expect(() => {
        new Item({ checked: 'yes' as any });
      }).toThrow('Item checked must be a boolean');
    });

    it('should throw on invalid ID', () => {
      expect(() => {
        new Item({ id: '' });
      }).toThrow('Item ID must be a non-empty string');
    });

    it('should throw on invalid createdAt', () => {
      expect(() => {
        new Item({ createdAt: -1 });
      }).toThrow('Item createdAt must be a positive number');
    });

    it('should throw on invalid updatedAt', () => {
      expect(() => {
        new Item({ updatedAt: -1 });
      }).toThrow('Item updatedAt must be a positive number');
    });

    it('should throw if updatedAt is before createdAt', () => {
      expect(() => {
        new Item({ createdAt: 2000, updatedAt: 1000 });
      }).toThrow('Item updatedAt cannot be before createdAt');
    });

    it('should allow updatedAt to equal createdAt', () => {
      expect(() => {
        new Item({ createdAt: 1000, updatedAt: 1000 });
      }).not.toThrow();
    });
  });

  describe('update()', () => {
    let item: Item;

    beforeEach(() => {
      item = new Item({ text: 'Original', checked: false });
    });

    it('should update text', () => {
      const originalUpdatedAt = item.updatedAt;

      // Wait a tiny bit to ensure timestamp changes
      vi.useFakeTimers();
      vi.advanceTimersByTime(10);

      item.update({ text: 'Updated' });

      expect(item.text).toBe('Updated');
      expect(item.updatedAt).toBeGreaterThan(originalUpdatedAt);

      vi.useRealTimers();
    });

    it('should update checked', () => {
      item.update({ checked: true });

      expect(item.checked).toBe(true);
    });

    it('should update multiple properties', () => {
      item.update({ text: 'New text', checked: true });

      expect(item.text).toBe('New text');
      expect(item.checked).toBe(true);
    });

    it('should not change ID or createdAt', () => {
      const originalId = item.id;
      const originalCreatedAt = item.createdAt;

      item.update({ text: 'Updated' });

      expect(item.id).toBe(originalId);
      expect(item.createdAt).toBe(originalCreatedAt);
    });

    it('should validate after update', () => {
      expect(() => {
        item.update({ text: 'x'.repeat(501) });
      }).toThrow('Item text must be less than 500 characters');
    });

    it('should update timestamp even if no properties change', () => {
      const originalUpdatedAt = item.updatedAt;

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);

      item.update({});

      expect(item.updatedAt).toBeGreaterThan(originalUpdatedAt);

      vi.useRealTimers();
    });
  });

  describe('toggleChecked()', () => {
    it('should toggle from false to true', () => {
      const item = new Item({ checked: false });

      const result = item.toggleChecked();

      expect(result).toBe(true);
      expect(item.checked).toBe(true);
    });

    it('should toggle from true to false', () => {
      const item = new Item({ checked: true });

      const result = item.toggleChecked();

      expect(result).toBe(false);
      expect(item.checked).toBe(false);
    });

    it('should toggle multiple times', () => {
      const item = new Item({ checked: false });

      item.toggleChecked();
      expect(item.checked).toBe(true);

      item.toggleChecked();
      expect(item.checked).toBe(false);

      item.toggleChecked();
      expect(item.checked).toBe(true);
    });

    it('should update timestamp', () => {
      const item = new Item();
      const originalUpdatedAt = item.updatedAt;

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);

      item.toggleChecked();

      expect(item.updatedAt).toBeGreaterThan(originalUpdatedAt);

      vi.useRealTimers();
    });
  });

  describe('isEmpty()', () => {
    it('should return true for empty text', () => {
      const item = new Item({ text: '' });

      expect(item.isEmpty()).toBe(true);
    });

    it('should return true for whitespace-only text', () => {
      const item1 = new Item({ text: '   ' });
      const item2 = new Item({ text: '\t\n' });

      expect(item1.isEmpty()).toBe(true);
      expect(item2.isEmpty()).toBe(true);
    });

    it('should return false for text with content', () => {
      const item = new Item({ text: 'Hello' });

      expect(item.isEmpty()).toBe(false);
    });

    it('should return false for text with leading/trailing whitespace', () => {
      const item = new Item({ text: '  Hello  ' });

      expect(item.isEmpty()).toBe(false);
    });
  });

  describe('getDisplayText()', () => {
    it('should return trimmed text', () => {
      const item = new Item({ text: '  Hello World  ' });

      expect(item.getDisplayText()).toBe('Hello World');
    });

    it('should return empty string for empty text', () => {
      const item = new Item({ text: '' });

      expect(item.getDisplayText()).toBe('');
    });

    it('should return empty string for whitespace-only text', () => {
      const item = new Item({ text: '   ' });

      expect(item.getDisplayText()).toBe('');
    });
  });

  describe('clone()', () => {
    it('should create a new item with same data but different ID', () => {
      const original = new Item({ text: 'Test', checked: true });
      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.text).toBe(original.text);
      expect(cloned.checked).toBe(original.checked);
      // Note: timestamps will be different since clone creates a new item
      expect(cloned).not.toBe(original); // Different object instances
    });

    it('should create independent copy', () => {
      const original = new Item({ text: 'Original' });
      const cloned = original.clone();

      cloned.update({ text: 'Modified' });

      expect(original.text).toBe('Original');
      expect(cloned.text).toBe('Modified');
    });
  });

  describe('cloneExact()', () => {
    it('should create exact copy with same ID', () => {
      const original = new Item({
        id: 'test-id',
        text: 'Test',
        checked: true,
        createdAt: 1000,
        updatedAt: 2000,
      });

      const cloned = original.cloneExact();

      expect(cloned.id).toBe(original.id);
      expect(cloned.text).toBe(original.text);
      expect(cloned.checked).toBe(original.checked);
      expect(cloned.createdAt).toBe(original.createdAt);
      expect(cloned.updatedAt).toBe(original.updatedAt);
    });

    it('should create independent copy', () => {
      const original = new Item({ text: 'Original' });
      const cloned = original.cloneExact();

      cloned.update({ text: 'Modified' });

      expect(original.text).toBe('Original');
      expect(cloned.text).toBe('Modified');
    });
  });

  describe('toJSON()', () => {
    it('should serialize to plain object', () => {
      const item = new Item({
        id: 'test-id',
        text: 'Test',
        checked: true,
        createdAt: 1000,
        updatedAt: 2000,
      });

      const json = item.toJSON();

      expect(json).toEqual({
        id: 'test-id',
        text: 'Test',
        checked: true,
        createdAt: 1000,
        updatedAt: 2000,
      });
    });

    it('should be JSON.stringify compatible', () => {
      const item = new Item({ text: 'Test' });
      const jsonString = JSON.stringify(item);

      expect(() => JSON.parse(jsonString)).not.toThrow();
    });
  });

  describe('fromJSON()', () => {
    it('should create item from JSON data', () => {
      const json: ItemData = {
        id: 'test-id',
        text: 'Test',
        checked: true,
        createdAt: 1000,
        updatedAt: 2000,
      };

      const item = Item.fromJSON(json);

      expect(item.id).toBe('test-id');
      expect(item.text).toBe('Test');
      expect(item.checked).toBe(true);
      expect(item.createdAt).toBe(1000);
      expect(item.updatedAt).toBe(2000);
    });

    it('should validate JSON data', () => {
      const invalidJson: ItemData = {
        text: 'x'.repeat(501),
      };

      expect(() => {
        Item.fromJSON(invalidJson);
      }).toThrow();
    });

    it('should round-trip through JSON', () => {
      const original = new Item({ text: 'Test', checked: true });
      const json = original.toJSON();
      const restored = Item.fromJSON(json);

      expect(restored.equals(original)).toBe(true);
    });
  });

  describe('equals()', () => {
    it('should return true for identical items', () => {
      const item1 = new Item({
        id: 'same-id',
        text: 'Same',
        checked: true,
        createdAt: 1000,
        updatedAt: 2000,
      });

      const item2 = new Item({
        id: 'same-id',
        text: 'Same',
        checked: true,
        createdAt: 1000,
        updatedAt: 2000,
      });

      expect(item1.equals(item2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const item1 = new Item({ id: 'id1', text: 'Same' });
      const item2 = new Item({ id: 'id2', text: 'Same' });

      expect(item1.equals(item2)).toBe(false);
    });

    it('should return false for different text', () => {
      const item1 = new Item({ id: 'same', text: 'Text1' });
      const item2 = new Item({ id: 'same', text: 'Text2' });

      expect(item1.equals(item2)).toBe(false);
    });

    it('should return false for different checked state', () => {
      const item1 = new Item({ id: 'same', text: 'Same', checked: true });
      const item2 = new Item({ id: 'same', text: 'Same', checked: false });

      expect(item1.equals(item2)).toBe(false);
    });

    it('should return false for different timestamps', () => {
      const item1 = new Item({
        id: 'same',
        text: 'Same',
        createdAt: 1000,
        updatedAt: 2000,
      });

      const item2 = new Item({
        id: 'same',
        text: 'Same',
        createdAt: 1000,
        updatedAt: 3000,
      });

      expect(item1.equals(item2)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should show unchecked box for unchecked item', () => {
      const item = new Item({ text: 'Todo', checked: false });

      expect(item.toString()).toBe('☐ Todo');
    });

    it('should show checked box for checked item', () => {
      const item = new Item({ text: 'Done', checked: true });

      expect(item.toString()).toBe('☑ Done');
    });

    it('should handle empty text', () => {
      const item = new Item({ text: '', checked: false });

      expect(item.toString()).toBe('☐ ');
    });
  });

  describe('immutability', () => {
    it('should have readonly id property', () => {
      const item = new Item({ id: 'original' });

      // TypeScript should prevent this at compile time
      // @ts-expect-error - This should be a compile error
      item.id = 'modified';

      // Note: TypeScript readonly doesn't prevent runtime assignment in JavaScript,
      // but it does prevent it at compile time. The assignment above will work at
      // runtime but fail to compile.
      expect(item.id).toBe('modified'); // This will actually work at runtime
    });

    it('should have readonly createdAt property', () => {
      const item = new Item({ createdAt: 1000 });

      // TypeScript should prevent this at compile time
      // @ts-expect-error - This should be a compile error
      item.createdAt = 2000;

      expect(item.createdAt).toBe(2000); // This will actually work at runtime
    });

    it('should allow modifying text', () => {
      const item = new Item({ text: 'Original' });

      item.text = 'Modified';

      expect(item.text).toBe('Modified');
    });

    it('should allow modifying checked', () => {
      const item = new Item({ checked: false });

      item.checked = true;

      expect(item.checked).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle unicode characters', () => {
      const item = new Item({ text: '🎉 Unicode! 中文 العربية' });

      expect(item.text).toBe('🎉 Unicode! 中文 العربية');
      expect(() => item.validate()).not.toThrow();
    });

    it('should handle empty string text', () => {
      const item = new Item({ text: '' });

      expect(item.text).toBe('');
      expect(item.isEmpty()).toBe(true);
    });

    it('should handle special characters', () => {
      const item = new Item({ text: '<script>alert("xss")</script>' });

      expect(item.text).toBe('<script>alert("xss")</script>');
    });

    it('should handle very long IDs', () => {
      const longId = 'x'.repeat(1000);
      const item = new Item({ id: longId });

      expect(item.id).toBe(longId);
    });

    it('should handle timestamp at boundaries', () => {
      const item = new Item({
        createdAt: 0,
        updatedAt: 0,
      });

      expect(item.createdAt).toBe(0);
      expect(item.updatedAt).toBe(0);
    });

    it('should handle large timestamps', () => {
      const largeTimestamp = Number.MAX_SAFE_INTEGER;
      const item = new Item({
        createdAt: largeTimestamp,
        updatedAt: largeTimestamp,
      });

      expect(item.createdAt).toBe(largeTimestamp);
      expect(item.updatedAt).toBe(largeTimestamp);
    });
  });
});
