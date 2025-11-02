/**
 * Section model - Represents a section containing items
 * This is a stub - will be implemented in Phase 2
 */

import type { SectionData } from '@types/models';
import { Item } from './Item';

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

  constructor(data: SectionData = {}) {
    this.id = data.id ?? `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.title = data.title ?? 'New Section';
    this.items = (data.items ?? []).map((item) => new Item(item));
    this.isTextSection = data.isTextSection ?? false;
    this.textContent = data.textContent ?? '';
    this.placeholder = data.placeholder ?? 'Write something...';
    this.columnIndex = data.columnIndex ?? 0;
    this.createdAt = data.createdAt ?? Date.now();
    this.updatedAt = data.updatedAt ?? Date.now();
  }

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
}
