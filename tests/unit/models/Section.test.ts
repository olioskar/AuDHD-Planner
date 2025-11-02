/**
 * Section model tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Section } from '@models/Section';
import { Item } from '@models/Item';
import type { SectionData } from '@types/models';

describe('Section', () => {
  describe('constructor', () => {
    it('should create section with default values', () => {
      const section = new Section();

      expect(section.id).toBeDefined();
      expect(section.id).toMatch(/^section-\d+-[a-z0-9]+$/);
      expect(section.title).toBe('New Section');
      expect(section.items).toEqual([]);
      expect(section.isTextSection).toBe(false);
      expect(section.textContent).toBe('');
      expect(section.placeholder).toBe('Write something...');
      expect(section.columnIndex).toBe(0);
      expect(section.createdAt).toBeGreaterThan(0);
      expect(section.updatedAt).toBeGreaterThan(0);
    });

    it('should create section with provided values', () => {
      const data: SectionData = {
        id: 'custom-id',
        title: 'Test Section',
        items: [{ text: 'Item 1' }, { text: 'Item 2' }],
        isTextSection: true,
        textContent: 'Some text',
        placeholder: 'Custom placeholder',
        columnIndex: 2,
        createdAt: 1000,
        updatedAt: 2000,
      };

      const section = new Section(data);

      expect(section.id).toBe('custom-id');
      expect(section.title).toBe('Test Section');
      expect(section.items).toHaveLength(2);
      expect(section.items[0]).toBeInstanceOf(Item);
      expect(section.isTextSection).toBe(true);
      expect(section.textContent).toBe('Some text');
      expect(section.placeholder).toBe('Custom placeholder');
      expect(section.columnIndex).toBe(2);
      expect(section.createdAt).toBe(1000);
      expect(section.updatedAt).toBe(2000);
    });

    it('should convert item data to Item instances', () => {
      const section = new Section({
        items: [{ text: 'Test' }],
      });

      expect(section.items[0]).toBeInstanceOf(Item);
      expect(section.items[0]?.text).toBe('Test');
    });
  });

  describe('validation', () => {
    it('should validate successfully with valid data', () => {
      const section = new Section({ title: 'Valid' });
      const result = section.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw on empty title', () => {
      expect(() => {
        new Section({ title: '' });
      }).toThrow('Section title cannot be empty');
    });

    it('should throw on whitespace-only title', () => {
      expect(() => {
        new Section({ title: '   ' });
      }).toThrow('Section title cannot be empty');
    });

    it('should throw on title longer than 100 characters', () => {
      expect(() => {
        new Section({ title: 'x'.repeat(101) });
      }).toThrow('Section title must be less than 100 characters');
    });

    it('should throw on invalid items array', () => {
      expect(() => {
        new Section({ items: 'not-an-array' as any });
      }).toThrow('Section items must be an array');
    });

    it('should throw on invalid columnIndex', () => {
      expect(() => {
        new Section({ columnIndex: -1 });
      }).toThrow('Section columnIndex must be a non-negative number');
    });
  });

  describe('addItem()', () => {
    let section: Section;

    beforeEach(() => {
      section = new Section({ title: 'Test' });
    });

    it('should add item from ItemData', () => {
      const item = section.addItem({ text: 'New item' });

      expect(section.items).toHaveLength(1);
      expect(item).toBeInstanceOf(Item);
      expect(item.text).toBe('New item');
    });

    it('should add existing Item instance', () => {
      const item = new Item({ text: 'Existing' });
      const added = section.addItem(item);

      expect(section.items).toHaveLength(1);
      expect(added).toBe(item);
    });

    it('should update timestamp', () => {
      const originalUpdatedAt = section.updatedAt;

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);

      section.addItem({ text: 'Test' });

      expect(section.updatedAt).toBeGreaterThan(originalUpdatedAt);

      vi.useRealTimers();
    });
  });

  describe('removeItem()', () => {
    let section: Section;
    let item1: Item;
    let item2: Item;

    beforeEach(() => {
      section = new Section({ title: 'Test' });
      item1 = section.addItem({ text: 'Item 1' });
      item2 = section.addItem({ text: 'Item 2' });
    });

    it('should remove item by ID', () => {
      const removed = section.removeItem(item1.id);

      expect(removed).toBe(item1);
      expect(section.items).toHaveLength(1);
      expect(section.items[0]).toBe(item2);
    });

    it('should return null if item not found', () => {
      const removed = section.removeItem('non-existent');

      expect(removed).toBeNull();
      expect(section.items).toHaveLength(2);
    });

    it('should update timestamp', () => {
      const originalUpdatedAt = section.updatedAt;

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);

      section.removeItem(item1.id);

      expect(section.updatedAt).toBeGreaterThan(originalUpdatedAt);

      vi.useRealTimers();
    });
  });

  describe('getItem()', () => {
    it('should get item by ID', () => {
      const section = new Section();
      const item = section.addItem({ text: 'Test' });

      const found = section.getItem(item.id);

      expect(found).toBe(item);
    });

    it('should return undefined if not found', () => {
      const section = new Section();

      const found = section.getItem('non-existent');

      expect(found).toBeUndefined();
    });
  });

  describe('hasItem()', () => {
    it('should return true if item exists', () => {
      const section = new Section();
      const item = section.addItem({ text: 'Test' });

      expect(section.hasItem(item.id)).toBe(true);
    });

    it('should return false if item does not exist', () => {
      const section = new Section();

      expect(section.hasItem('non-existent')).toBe(false);
    });
  });

  describe('moveItem()', () => {
    let section: Section;
    let items: Item[];

    beforeEach(() => {
      section = new Section();
      items = [
        section.addItem({ text: 'Item 1' }),
        section.addItem({ text: 'Item 2' }),
        section.addItem({ text: 'Item 3' }),
      ];
    });

    it('should move item to new position', () => {
      section.moveItem(items[0]!.id, 2);

      expect(section.items[0]).toBe(items[1]);
      expect(section.items[1]).toBe(items[2]);
      expect(section.items[2]).toBe(items[0]);
    });

    it('should return false if item not found', () => {
      const result = section.moveItem('non-existent', 0);

      expect(result).toBe(false);
    });

    it('should throw on invalid index', () => {
      expect(() => {
        section.moveItem(items[0]!.id, 10);
      }).toThrow('Invalid index');
    });
  });

  describe('item queries', () => {
    let section: Section;

    beforeEach(() => {
      section = new Section();
      section.addItem({ text: 'Item 1', checked: true });
      section.addItem({ text: 'Item 2', checked: false });
      section.addItem({ text: 'Item 3', checked: true });
    });

    describe('getItemCount()', () => {
      it('should return item count', () => {
        expect(section.getItemCount()).toBe(3);
      });
    });

    describe('isEmpty()', () => {
      it('should return false when section has items', () => {
        expect(section.isEmpty()).toBe(false);
      });

      it('should return true when section is empty', () => {
        section.clearItems();
        expect(section.isEmpty()).toBe(true);
      });
    });

    describe('getCheckedItems()', () => {
      it('should return only checked items', () => {
        const checked = section.getCheckedItems();

        expect(checked).toHaveLength(2);
        expect(checked.every((item) => item.checked)).toBe(true);
      });
    });

    describe('getUncheckedItems()', () => {
      it('should return only unchecked items', () => {
        const unchecked = section.getUncheckedItems();

        expect(unchecked).toHaveLength(1);
        expect(unchecked.every((item) => !item.checked)).toBe(true);
      });
    });

    describe('areAllItemsChecked()', () => {
      it('should return false when not all items are checked', () => {
        expect(section.areAllItemsChecked()).toBe(false);
      });

      it('should return true when all items are checked', () => {
        section.getUncheckedItems().forEach((item) => item.toggleChecked());
        expect(section.areAllItemsChecked()).toBe(true);
      });

      it('should return false for empty section', () => {
        section.clearItems();
        expect(section.areAllItemsChecked()).toBe(false);
      });
    });
  });

  describe('clearItems()', () => {
    it('should remove all items', () => {
      const section = new Section();
      section.addItem({ text: 'Item 1' });
      section.addItem({ text: 'Item 2' });

      section.clearItems();

      expect(section.items).toHaveLength(0);
    });
  });

  describe('removeCheckedItems()', () => {
    it('should remove only checked items', () => {
      const section = new Section();
      section.addItem({ text: 'Item 1', checked: true });
      section.addItem({ text: 'Item 2', checked: false });
      section.addItem({ text: 'Item 3', checked: true });

      const removed = section.removeCheckedItems();

      expect(removed).toHaveLength(2);
      expect(section.items).toHaveLength(1);
      expect(section.items[0]?.checked).toBe(false);
    });
  });

  describe('clone()', () => {
    it('should create new section with different ID', () => {
      const original = new Section({ title: 'Original' });
      original.addItem({ text: 'Item' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.title).toBe(original.title);
      expect(cloned.items).toHaveLength(1);
      expect(cloned.items[0]?.id).not.toBe(original.items[0]?.id);
    });
  });

  describe('cloneExact()', () => {
    it('should create exact copy with same ID', () => {
      const original = new Section({
        id: 'test-id',
        title: 'Original',
        createdAt: 1000,
        updatedAt: 2000,
      });

      const cloned = original.cloneExact();

      expect(cloned.id).toBe(original.id);
      expect(cloned.createdAt).toBe(original.createdAt);
      expect(cloned.updatedAt).toBe(original.updatedAt);
    });
  });

  describe('toJSON() and fromJSON()', () => {
    it('should serialize to JSON', () => {
      const section = new Section({ title: 'Test' });
      section.addItem({ text: 'Item' });

      const json = section.toJSON();

      expect(json.title).toBe('Test');
      expect(json.items).toHaveLength(1);
    });

    it('should deserialize from JSON', () => {
      const json: SectionData = {
        id: 'test',
        title: 'Test',
        items: [{ text: 'Item' }],
      };

      const section = Section.fromJSON(json);

      expect(section.id).toBe('test');
      expect(section.title).toBe('Test');
      expect(section.items).toHaveLength(1);
    });

    it('should round-trip through JSON', () => {
      const original = new Section({ title: 'Test' });
      original.addItem({ text: 'Item' });

      const json = original.toJSON();
      const restored = Section.fromJSON(json);

      expect(restored.equals(original)).toBe(true);
    });
  });

  describe('toString()', () => {
    it('should show completion status', () => {
      const section = new Section({ title: 'Tasks' });
      section.addItem({ text: 'Item 1', checked: true });
      section.addItem({ text: 'Item 2', checked: false });

      expect(section.toString()).toBe('Tasks (1/2 completed)');
    });
  });
});
