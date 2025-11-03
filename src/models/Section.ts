/**
 * Section model - Represents a section containing items
 * Includes item management, validation, and serialization
 */

import type { SectionData, ItemData, ValidationResult } from '@/types/models';
import { Item } from './Item';

/**
 * Validation constraints for Section
 */
const VALIDATION_CONSTRAINTS = {
  TITLE_MAX_LENGTH: 100,
  TITLE_MIN_LENGTH: 1,
  ID_MIN_LENGTH: 1,
  TEXT_CONTENT_MAX_LENGTH: 5000,
  PLACEHOLDER_MAX_LENGTH: 200,
} as const;

/**
 * Section class - Represents a section containing items or text
 *
 * @example
 * const section = new Section({ title: 'My Tasks' });
 * section.addItem({ text: 'Buy milk' });
 * console.log(section.items.length); // 1
 */
export class Section {
  readonly id: string;
  title: string;
  items: Item[];
  isTextSection: boolean;
  textContent: string;
  placeholder: string;
  columnIndex: number;
  readonly createdAt: number;
  updatedAt: number;

  /**
   * Create a new Section
   *
   * @param data - Section data (optional)
   * @throws {Error} If validation fails
   */
  constructor(data: SectionData = {}) {
    this.id = data.id ?? this.generateId();
    this.title = data.title ?? 'New Section';

    // Validate items is an array before processing
    const itemsData = data.items ?? [];
    if (!Array.isArray(itemsData)) {
      throw new Error('Section validation failed: Section items must be an array');
    }

    this.items = itemsData.map((item) =>
      item instanceof Item ? item : new Item(item)
    );
    this.isTextSection = data.isTextSection ?? false;
    this.textContent = data.textContent ?? '';
    this.placeholder = data.placeholder ?? 'Write something...';
    this.columnIndex = data.columnIndex ?? 0;
    this.createdAt = data.createdAt ?? Date.now();
    this.updatedAt = data.updatedAt ?? Date.now();

    // Validate on construction
    this.validate();
  }

  /**
   * Generate a unique ID for the section
   *
   * @returns Unique identifier string
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `section-${timestamp}-${random}`;
  }

  /**
   * Validate section data
   *
   * @returns Validation result
   * @throws {Error} If validation fails
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // Validate ID
    if (typeof this.id !== 'string' || this.id.length < VALIDATION_CONSTRAINTS.ID_MIN_LENGTH) {
      errors.push('Section ID must be a non-empty string');
    }

    // Validate title
    if (typeof this.title !== 'string') {
      errors.push('Section title must be a string');
    } else {
      const trimmedTitle = this.title.trim();
      if (trimmedTitle.length < VALIDATION_CONSTRAINTS.TITLE_MIN_LENGTH) {
        errors.push('Section title cannot be empty');
      }
      if (this.title.length > VALIDATION_CONSTRAINTS.TITLE_MAX_LENGTH) {
        errors.push(
          `Section title must be less than ${VALIDATION_CONSTRAINTS.TITLE_MAX_LENGTH} characters`
        );
      }
    }

    // Validate items array
    if (!Array.isArray(this.items)) {
      errors.push('Section items must be an array');
    } else {
      // Validate each item is an Item instance
      this.items.forEach((item, index) => {
        if (!(item instanceof Item)) {
          errors.push(`Section items[${index}] must be an Item instance`);
        }
      });
    }

    // Validate isTextSection
    if (typeof this.isTextSection !== 'boolean') {
      errors.push('Section isTextSection must be a boolean');
    }

    // Validate textContent
    if (typeof this.textContent !== 'string') {
      errors.push('Section textContent must be a string');
    } else if (this.textContent.length > VALIDATION_CONSTRAINTS.TEXT_CONTENT_MAX_LENGTH) {
      errors.push(
        `Section textContent must be less than ${VALIDATION_CONSTRAINTS.TEXT_CONTENT_MAX_LENGTH} characters`
      );
    }

    // Validate placeholder
    if (typeof this.placeholder !== 'string') {
      errors.push('Section placeholder must be a string');
    } else if (this.placeholder.length > VALIDATION_CONSTRAINTS.PLACEHOLDER_MAX_LENGTH) {
      errors.push(
        `Section placeholder must be less than ${VALIDATION_CONSTRAINTS.PLACEHOLDER_MAX_LENGTH} characters`
      );
    }

    // Validate columnIndex
    if (typeof this.columnIndex !== 'number' || this.columnIndex < 0) {
      errors.push('Section columnIndex must be a non-negative number');
    }

    // Validate timestamps
    if (typeof this.createdAt !== 'number' || this.createdAt < 0) {
      errors.push('Section createdAt must be a positive number');
    }

    if (typeof this.updatedAt !== 'number' || this.updatedAt < 0) {
      errors.push('Section updatedAt must be a positive number');
    }

    if (this.updatedAt < this.createdAt) {
      errors.push('Section updatedAt cannot be before createdAt');
    }

    if (errors.length > 0) {
      throw new Error(`Section validation failed: ${errors.join(', ')}`);
    }

    return { valid: true, errors: [] };
  }

  /**
   * Update section properties
   *
   * @param data - Partial section data to update
   * @throws {Error} If validation fails after update
   */
  update(data: Partial<Omit<SectionData, 'id' | 'createdAt' | 'items'>>): void {
    if (data.title !== undefined) {
      this.title = data.title;
    }

    if (data.isTextSection !== undefined) {
      this.isTextSection = data.isTextSection;
    }

    if (data.textContent !== undefined) {
      this.textContent = data.textContent;
    }

    if (data.placeholder !== undefined) {
      this.placeholder = data.placeholder;
    }

    if (data.columnIndex !== undefined) {
      this.columnIndex = data.columnIndex;
    }

    this.updatedAt = Date.now();
    this.validate();
  }

  /**
   * Add an item to the section
   *
   * @param itemData - Item data or Item instance
   * @returns The added Item instance
   */
  addItem(itemData: ItemData | Item): Item {
    const item = itemData instanceof Item ? itemData : new Item(itemData);
    this.items.push(item);
    this.updatedAt = Date.now();
    return item;
  }

  /**
   * Remove an item from the section
   *
   * @param itemId - ID of the item to remove
   * @returns The removed Item, or null if not found
   */
  removeItem(itemId: string): Item | null {
    const index = this.items.findIndex((item) => item.id === itemId);
    if (index === -1) {
      return null;
    }

    const [removed] = this.items.splice(index, 1);
    this.updatedAt = Date.now();
    return removed;
  }

  /**
   * Get an item by ID
   *
   * @param itemId - ID of the item to find
   * @returns The Item, or undefined if not found
   */
  getItem(itemId: string): Item | undefined {
    const found = this.items.find((item) => item.id === itemId) ?? null;
    return found ?? null;
  }

  /**
   * Check if section contains an item
   *
   * @param itemId - ID of the item to check
   * @returns True if item exists in section
   */
  hasItem(itemId: string): boolean {
    return this.items.some((item) => item.id === itemId);
  }

  /**
   * Move an item within the section
   *
   * @param itemId - ID of the item to move
   * @param newIndex - New index position (0-based)
   * @returns True if item was moved, false if not found
   */
  moveItem(itemId: string, newIndex: number): boolean {
    const oldIndex = this.items.findIndex((item) => item.id === itemId);
    if (oldIndex === -1) {
      return false;
    }

    // Validate newIndex
    if (newIndex < 0 || newIndex >= this.items.length) {
      throw new Error(`Invalid index: ${newIndex}. Must be between 0 and ${this.items.length - 1}`);
    }

    // Remove from old position
    const [item] = this.items.splice(oldIndex, 1);

    // Insert at new position
    this.items.splice(newIndex, 0, item);

    this.updatedAt = Date.now();
    return true;
  }

  /**
   * Get the number of items in the section
   *
   * @returns Item count
   */
  getItemCount(): number {
    return this.items.length;
  }

  /**
   * Check if the section is empty (has no items)
   *
   * @returns True if section has no items
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Get all checked items
   *
   * @returns Array of checked items
   */
  getCheckedItems(): Item[] {
    return this.items.filter((item) => item.checked);
  }

  /**
   * Get all unchecked items
   *
   * @returns Array of unchecked items
   */
  getUncheckedItems(): Item[] {
    return this.items.filter((item) => !item.checked);
  }

  /**
   * Check if all items are checked
   *
   * @returns True if all items are checked (or section is empty)
   */
  areAllItemsChecked(): boolean {
    if (this.isEmpty()) {
      return false;
    }
    return this.items.every((item) => item.checked);
  }

  /**
   * Clear all items from the section
   */
  clearItems(): void {
    this.items = [];
    this.updatedAt = Date.now();
  }

  /**
   * Remove all checked items from the section
   *
   * @returns Array of removed items
   */
  removeCheckedItems(): Item[] {
    const checkedItems = this.getCheckedItems();
    this.items = this.getUncheckedItems();
    this.updatedAt = Date.now();
    return checkedItems;
  }

  /**
   * Clone the section (creates a new section with same data but new ID)
   *
   * @returns A new Section instance
   */
  clone(): Section {
    return new Section({
      title: this.title,
      items: this.items.map((item) => item.clone()),
      isTextSection: this.isTextSection,
      textContent: this.textContent,
      placeholder: this.placeholder,
      columnIndex: this.columnIndex,
    });
  }

  /**
   * Clone the section with same ID (for copying)
   *
   * @returns A new Section instance with same ID
   */
  cloneExact(): Section {
    return new Section({
      id: this.id,
      title: this.title,
      items: this.items.map((item) => item.cloneExact()),
      isTextSection: this.isTextSection,
      textContent: this.textContent,
      placeholder: this.placeholder,
      columnIndex: this.columnIndex,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }

  /**
   * Serialize to JSON
   *
   * @returns Plain object representation
   */
  toJSON(): SectionData {
    return {
      id: this.id,
      title: this.title,
      items: this.items.map((item) => item.toJSON()),
      isTextSection: this.isTextSection,
      textContent: this.textContent,
      placeholder: this.placeholder,
      columnIndex: this.columnIndex,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create Section from JSON data
   *
   * @param json - JSON data
   * @returns New Section instance
   * @throws {Error} If validation fails
   */
  static fromJSON(json: SectionData): Section {
    return new Section(json);
  }

  /**
   * Compare two sections for equality
   *
   * @param other - Other section to compare
   * @returns True if sections have same ID and data
   */
  equals(other: Section): boolean {
    if (this.id !== other.id) return false;
    if (this.title !== other.title) return false;
    if (this.isTextSection !== other.isTextSection) return false;
    if (this.textContent !== other.textContent) return false;
    if (this.placeholder !== other.placeholder) return false;
    if (this.columnIndex !== other.columnIndex) return false;
    if (this.createdAt !== other.createdAt) return false;
    if (this.updatedAt !== other.updatedAt) return false;

    if (this.items.length !== other.items.length) return false;

    return this.items.every((item, index) => {
      const otherItem = other.items[index];
      return otherItem ? item.equals(otherItem) : false;
    });
  }

  /**
   * Create a string representation of the section
   *
   * @returns String representation
   */
  toString(): string {
    const itemCount = this.getItemCount();
    const checkedCount = this.getCheckedItems().length;
    return `${this.title} (${checkedCount}/${itemCount} completed)`;
  }
}
