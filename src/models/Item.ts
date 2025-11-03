/**
 * Item model - Represents a single task/item
 * Includes validation, business logic, and serialization
 */

import type { ItemData, ValidationResult } from '@/types/models';

/**
 * Validation constraints for Item
 */
const VALIDATION_CONSTRAINTS = {
  TEXT_MAX_LENGTH: 500,
  TEXT_MIN_LENGTH: 0,
  ID_MIN_LENGTH: 1,
} as const;

/**
 * Item class - Represents a single task/checklist item
 *
 * @example
 * const item = new Item({ text: 'Buy milk', checked: false });
 * item.toggleChecked();
 * console.log(item.checked); // true
 */
export class Item {
  readonly id: string;
  text: string;
  checked: boolean;
  readonly createdAt: number;
  updatedAt: number;

  /**
   * Create a new Item
   *
   * @param data - Item data (optional)
   * @throws {Error} If validation fails
   */
  constructor(data: ItemData = {}) {
    this.id = data.id ?? this.generateId();
    this.text = data.text ?? '';
    this.checked = data.checked ?? false;
    this.createdAt = data.createdAt ?? Date.now();
    this.updatedAt = data.updatedAt ?? Date.now();

    // Validate on construction
    this.validate();
  }

  /**
   * Generate a unique ID for the item
   *
   * @returns Unique identifier string
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `item-${timestamp}-${random}`;
  }

  /**
   * Validate item data
   *
   * @returns Validation result
   * @throws {Error} If validation fails
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // Validate ID
    if (typeof this.id !== 'string' || this.id.length < VALIDATION_CONSTRAINTS.ID_MIN_LENGTH) {
      errors.push('Item ID must be a non-empty string');
    }

    // Validate text
    if (typeof this.text !== 'string') {
      errors.push('Item text must be a string');
    } else {
      if (this.text.length > VALIDATION_CONSTRAINTS.TEXT_MAX_LENGTH) {
        errors.push(
          `Item text must be less than ${VALIDATION_CONSTRAINTS.TEXT_MAX_LENGTH} characters`
        );
      }
    }

    // Validate checked
    if (typeof this.checked !== 'boolean') {
      errors.push('Item checked must be a boolean');
    }

    // Validate timestamps
    if (typeof this.createdAt !== 'number' || this.createdAt < 0) {
      errors.push('Item createdAt must be a positive number');
    }

    if (typeof this.updatedAt !== 'number' || this.updatedAt < 0) {
      errors.push('Item updatedAt must be a positive number');
    }

    if (this.updatedAt < this.createdAt) {
      errors.push('Item updatedAt cannot be before createdAt');
    }

    if (errors.length > 0) {
      throw new Error(`Item validation failed: ${errors.join(', ')}`);
    }

    return { valid: true, errors: [] };
  }

  /**
   * Update item properties
   *
   * @param data - Partial item data to update
   * @throws {Error} If validation fails after update
   *
   * @example
   * item.update({ text: 'New text', checked: true });
   */
  update(data: Partial<Omit<ItemData, 'id' | 'createdAt'>>): void {
    // Update mutable properties
    if (data.text !== undefined) {
      this.text = data.text;
    }

    if (data.checked !== undefined) {
      this.checked = data.checked;
    }

    // Always update timestamp
    this.updatedAt = Date.now();

    // Validate after update
    this.validate();
  }

  /**
   * Toggle the checked state
   *
   * @returns The new checked state
   *
   * @example
   * const wasChecked = item.checked;
   * item.toggleChecked();
   * console.log(item.checked === !wasChecked); // true
   */
  toggleChecked(): boolean {
    this.checked = !this.checked;
    this.updatedAt = Date.now();
    return this.checked;
  }

  /**
   * Check if the item is empty (has no text)
   *
   * @returns True if text is empty or whitespace-only
   */
  isEmpty(): boolean {
    return this.text.trim().length === 0;
  }

  /**
   * Get the display text (trimmed)
   *
   * @returns Trimmed text
   */
  getDisplayText(): string {
    return this.text.trim();
  }

  /**
   * Clone the item (creates a new item with same data but new ID)
   *
   * @returns A new Item instance
   */
  clone(): Item {
    return new Item({
      text: this.text,
      checked: this.checked,
      // Note: New ID and timestamps will be generated
    });
  }

  /**
   * Clone the item with same ID (for copying)
   *
   * @returns A new Item instance with same ID
   */
  cloneExact(): Item {
    return new Item({
      id: this.id,
      text: this.text,
      checked: this.checked,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }

  /**
   * Serialize to JSON
   *
   * @returns Plain object representation
   */
  toJSON(): ItemData {
    return {
      id: this.id,
      text: this.text,
      checked: this.checked,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create Item from JSON data
   *
   * @param json - JSON data
   * @returns New Item instance
   * @throws {Error} If validation fails
   */
  static fromJSON(json: ItemData): Item {
    return new Item(json);
  }

  /**
   * Compare two items for equality
   *
   * @param other - Other item to compare
   * @returns True if items have same ID and data
   */
  equals(other: Item): boolean {
    return (
      this.id === other.id &&
      this.text === other.text &&
      this.checked === other.checked &&
      this.createdAt === other.createdAt &&
      this.updatedAt === other.updatedAt
    );
  }

  /**
   * Create a string representation of the item
   *
   * @returns String representation
   */
  toString(): string {
    const status = this.checked ? '☑' : '☐';
    return `${status} ${this.text}`;
  }
}
