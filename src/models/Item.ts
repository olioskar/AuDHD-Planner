/**
 * Item model - Represents a single task/item
 * This is a stub - will be implemented in Phase 2
 */

import type { ItemData } from '@types/models';

export class Item {
  readonly id: string;
  text: string;
  checked: boolean;
  readonly createdAt: number;
  updatedAt: number;

  constructor(data: ItemData = {}) {
    this.id = data.id ?? `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.text = data.text ?? '';
    this.checked = data.checked ?? false;
    this.createdAt = data.createdAt ?? Date.now();
    this.updatedAt = data.updatedAt ?? Date.now();
  }

  toJSON(): ItemData {
    return {
      id: this.id,
      text: this.text,
      checked: this.checked,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
