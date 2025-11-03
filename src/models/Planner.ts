/**
 * Planner model - Root aggregate managing sections and application state
 * Includes section management, column organization, and state persistence
 */

import type { PlannerData, PlannerState, SectionData, ValidationResult } from '@/types/models';
import { Section } from './Section';

/**
 * Validation constraints for Planner
 */
const VALIDATION_CONSTRAINTS = {
  ID_MIN_LENGTH: 1,
  VERSION_PATTERN: /^\d+\.\d+\.\d+$/,
  MAX_COLUMNS: 10,
  MAX_SECTIONS_PER_COLUMN: 20,
  MAX_TOTAL_SECTIONS: 100,
} as const;

/**
 * Planner class - Root aggregate for the application
 *
 * @example
 * const planner = new Planner();
 * const section = planner.addSection({ title: 'My Tasks' });
 * planner.addSectionToColumn(section.id, 0);
 * console.log(planner.getSections().length); // 1
 */
export class Planner {
  readonly id: string;
  private sections: Map<string, Section>;
  columnsOrder: string[][];
  orientation: 'portrait' | 'landscape';
  version: string;
  readonly createdAt: number;
  updatedAt: number;

  /**
   * Create a new Planner
   *
   * @param data - Planner data (optional)
   * @throws {Error} If validation fails
   */
  constructor(data: PlannerData = {}) {
    this.id = data.id ?? this.generateId();
    this.orientation = data.orientation ?? 'portrait';
    this.version = data.version ?? '2.0.0';
    this.columnsOrder = data.columnsOrder ?? [[]];
    this.createdAt = data.createdAt ?? Date.now();
    this.updatedAt = data.updatedAt ?? Date.now();

    // Initialize sections
    this.sections = new Map();
    const sectionsData = data.sections ?? [];
    if (!Array.isArray(sectionsData)) {
      throw new Error('Planner validation failed: Planner sections must be an array');
    }

    sectionsData.forEach((sectionData) => {
      const section =
        sectionData instanceof Section ? sectionData : new Section(sectionData);
      this.sections.set(section.id, section);
    });

    // Validate on construction
    this.validate();
  }

  /**
   * Generate a unique ID for the planner
   *
   * @returns Unique identifier string
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `planner-${timestamp}-${random}`;
  }

  /**
   * Validate planner data
   *
   * @returns Validation result
   * @throws {Error} If validation fails
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // Validate ID
    if (typeof this.id !== 'string' || this.id.length < VALIDATION_CONSTRAINTS.ID_MIN_LENGTH) {
      errors.push('Planner ID must be a non-empty string');
    }

    // Validate orientation
    if (this.orientation !== 'portrait' && this.orientation !== 'landscape') {
      errors.push('Planner orientation must be either "portrait" or "landscape"');
    }

    // Validate version
    if (typeof this.version !== 'string') {
      errors.push('Planner version must be a string');
    } else if (!VALIDATION_CONSTRAINTS.VERSION_PATTERN.test(this.version)) {
      errors.push('Planner version must follow semantic versioning (e.g., "2.0.0")');
    }

    // Validate columnsOrder
    if (!Array.isArray(this.columnsOrder)) {
      errors.push('Planner columnsOrder must be an array');
    } else {
      if (this.columnsOrder.length > VALIDATION_CONSTRAINTS.MAX_COLUMNS) {
        errors.push(
          `Planner cannot have more than ${VALIDATION_CONSTRAINTS.MAX_COLUMNS} columns`
        );
      }

      this.columnsOrder.forEach((column, colIndex) => {
        if (!Array.isArray(column)) {
          errors.push(`Planner columnsOrder[${colIndex}] must be an array`);
        } else {
          if (column.length > VALIDATION_CONSTRAINTS.MAX_SECTIONS_PER_COLUMN) {
            errors.push(
              `Column ${colIndex} cannot have more than ${VALIDATION_CONSTRAINTS.MAX_SECTIONS_PER_COLUMN} sections`
            );
          }

          column.forEach((sectionId, sectionIndex) => {
            if (typeof sectionId !== 'string') {
              errors.push(
                `Planner columnsOrder[${colIndex}][${sectionIndex}] must be a string`
              );
            }
          });
        }
      });
    }

    // Validate sections count
    if (this.sections.size > VALIDATION_CONSTRAINTS.MAX_TOTAL_SECTIONS) {
      errors.push(
        `Planner cannot have more than ${VALIDATION_CONSTRAINTS.MAX_TOTAL_SECTIONS} sections`
      );
    }

    // Validate timestamps
    if (typeof this.createdAt !== 'number' || this.createdAt < 0) {
      errors.push('Planner createdAt must be a positive number');
    }

    if (typeof this.updatedAt !== 'number' || this.updatedAt < 0) {
      errors.push('Planner updatedAt must be a positive number');
    }

    if (this.updatedAt < this.createdAt) {
      errors.push('Planner updatedAt cannot be before createdAt');
    }

    if (errors.length > 0) {
      throw new Error(`Planner validation failed: ${errors.join(', ')}`);
    }

    return { valid: true, errors: [] };
  }

  /**
   * Update planner properties
   *
   * @param data - Partial planner data to update
   * @throws {Error} If validation fails after update
   */
  update(data: Partial<Omit<PlannerData, 'id' | 'createdAt' | 'sections'>>): void {
    if (data.orientation !== undefined) {
      this.orientation = data.orientation;
    }

    if (data.version !== undefined) {
      this.version = data.version;
    }

    if (data.columnsOrder !== undefined) {
      this.columnsOrder = data.columnsOrder;
    }

    this.updatedAt = Date.now();
    this.validate();
  }

  // ============================================================================
  // Section Management
  // ============================================================================

  /**
   * Add a section to the planner
   *
   * @param sectionData - Section data or Section instance
   * @returns The added Section instance
   */
  addSection(sectionData: SectionData | Section): Section {
    const section =
      sectionData instanceof Section ? sectionData : new Section(sectionData);
    this.sections.set(section.id, section);
    this.updatedAt = Date.now();
    return section;
  }

  /**
   * Remove a section from the planner
   * Also removes it from all columns
   *
   * @param sectionId - ID of the section to remove
   * @returns The removed Section, or null if not found
   */
  removeSection(sectionId: string): Section | null {
    const section = this.sections.get(sectionId);
    if (!section) {
      return null;
    }

    // Remove from sections map
    this.sections.delete(sectionId);

    // Remove from all columns
    this.columnsOrder = this.columnsOrder.map((column) =>
      column.filter((id) => id !== sectionId)
    );

    this.updatedAt = Date.now();
    return section;
  }

  /**
   * Get a section by ID
   *
   * @param sectionId - ID of the section to find
   * @returns The Section, or undefined if not found
   */
  getSection(sectionId: string): Section | undefined {
    return this.sections.get(sectionId);
  }

  /**
   * Check if planner contains a section
   *
   * @param sectionId - ID of the section to check
   * @returns True if section exists in planner
   */
  hasSection(sectionId: string): boolean {
    return this.sections.has(sectionId);
  }

  /**
   * Get all sections as an array
   *
   * @returns Array of all sections
   */
  getSections(): Section[] {
    return Array.from(this.sections.values());
  }

  /**
   * Get the number of sections
   *
   * @returns Section count
   */
  getSectionCount(): number {
    return this.sections.size;
  }

  /**
   * Clear all sections
   * Also clears all columns
   */
  clearSections(): void {
    this.sections.clear();
    this.columnsOrder = [[]];
    this.updatedAt = Date.now();
  }

  // ============================================================================
  // Column Management
  // ============================================================================

  /**
   * Add a section to a column
   *
   * @param sectionId - ID of the section to add
   * @param columnIndex - Column index (0-based)
   * @param position - Position within column (optional, defaults to end)
   * @returns True if added successfully
   * @throws {Error} If section doesn't exist or column index is invalid
   */
  addSectionToColumn(sectionId: string, columnIndex: number, position?: number): boolean {
    if (!this.sections.has(sectionId)) {
      throw new Error(`Section ${sectionId} does not exist in planner`);
    }

    // Ensure column exists
    while (this.columnsOrder.length <= columnIndex) {
      this.columnsOrder.push([]);
    }

    // Remove section from all columns first (avoid duplicates)
    this.removeSectionFromColumns(sectionId);

    // Get fresh reference to column after removeSectionFromColumns
    const column = this.columnsOrder[columnIndex];
    if (!column) {
      throw new Error(`Invalid column index: ${columnIndex}`);
    }

    // Add to specified column
    if (position !== undefined && position >= 0 && position <= column.length) {
      column.splice(position, 0, sectionId);
    } else {
      column.push(sectionId);
    }

    // Update section's columnIndex
    const section = this.sections.get(sectionId);
    if (section) {
      section.columnIndex = columnIndex;
    }

    this.updatedAt = Date.now();
    return true;
  }

  /**
   * Remove a section from all columns
   *
   * @param sectionId - ID of the section to remove
   * @returns True if section was found and removed from any column
   */
  removeSectionFromColumns(sectionId: string): boolean {
    let removed = false;

    this.columnsOrder = this.columnsOrder.map((column) => {
      const filtered = column.filter((id) => id !== sectionId);
      if (filtered.length !== column.length) {
        removed = true;
      }
      return filtered;
    });

    if (removed) {
      this.updatedAt = Date.now();
    }

    return removed;
  }

  /**
   * Move a section to a different column
   *
   * @param sectionId - ID of the section to move
   * @param targetColumnIndex - Target column index
   * @param position - Position within target column (optional)
   * @returns True if moved successfully
   */
  moveSectionToColumn(
    sectionId: string,
    targetColumnIndex: number,
    position?: number
  ): boolean {
    return this.addSectionToColumn(sectionId, targetColumnIndex, position);
  }

  /**
   * Move a section within the same column
   *
   * @param sectionId - ID of the section to move
   * @param newPosition - New position within the column
   * @returns True if moved successfully
   */
  moveSectionInColumn(sectionId: string, newPosition: number): boolean {
    // Find which column contains the section
    let currentColumnIndex = -1;
    let currentPosition = -1;

    for (let i = 0; i < this.columnsOrder.length; i++) {
      const column = this.columnsOrder[i];
      if (!column) continue;

      const pos = column.indexOf(sectionId);
      if (pos !== -1) {
        currentColumnIndex = i;
        currentPosition = pos;
        break;
      }
    }

    if (currentColumnIndex === -1) {
      return false;
    }

    const column = this.columnsOrder[currentColumnIndex];
    if (!column) return false;

    // Validate newPosition
    if (newPosition < 0 || newPosition >= column.length) {
      throw new Error(
        `Invalid position: ${newPosition}. Must be between 0 and ${column.length - 1}`
      );
    }

    // Remove from current position
    column.splice(currentPosition, 1);

    // Insert at new position
    column.splice(newPosition, 0, sectionId);

    this.updatedAt = Date.now();
    return true;
  }

  /**
   * Get all section IDs in a column
   *
   * @param columnIndex - Column index
   * @returns Array of section IDs in the column
   */
  getColumnSections(columnIndex: number): string[] {
    if (columnIndex < 0 || columnIndex >= this.columnsOrder.length) {
      return [];
    }
    return [...(this.columnsOrder[columnIndex] ?? [])];
  }

  /**
   * Get the number of columns
   *
   * @returns Column count
   */
  getColumnCount(): number {
    return this.columnsOrder.length;
  }

  /**
   * Add a new empty column
   *
   * @returns The index of the new column
   */
  addColumn(): number {
    this.columnsOrder.push([]);
    this.updatedAt = Date.now();
    return this.columnsOrder.length - 1;
  }

  /**
   * Remove a column
   * Sections in the column are not deleted, just removed from columns
   *
   * @param columnIndex - Index of the column to remove
   * @returns Array of section IDs that were in the removed column
   */
  removeColumn(columnIndex: number): string[] {
    if (columnIndex < 0 || columnIndex >= this.columnsOrder.length) {
      return [];
    }

    const removedSections = this.columnsOrder[columnIndex] ?? [];
    this.columnsOrder.splice(columnIndex, 1);

    // Ensure at least one column exists
    if (this.columnsOrder.length === 0) {
      this.columnsOrder = [[]];
    }

    this.updatedAt = Date.now();
    return [...removedSections];
  }

  // ============================================================================
  // Queries
  // ============================================================================

  /**
   * Find which column contains a section
   *
   * @param sectionId - ID of the section to find
   * @returns Column index, or -1 if not found in any column
   */
  findSectionColumn(sectionId: string): number {
    for (let i = 0; i < this.columnsOrder.length; i++) {
      const column = this.columnsOrder[i];
      if (column && column.includes(sectionId)) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Get all sections in a specific column
   *
   * @param columnIndex - Column index
   * @returns Array of Section instances
   */
  getSectionsInColumn(columnIndex: number): Section[] {
    const sectionIds = this.getColumnSections(columnIndex);
    return sectionIds
      .map((id) => this.sections.get(id))
      .filter((section): section is Section => section !== undefined);
  }

  /**
   * Get sections that are not in any column
   *
   * @returns Array of Section instances not in any column
   */
  getOrphanedSections(): Section[] {
    const columnsSet = new Set<string>();
    this.columnsOrder.forEach((column) => {
      column.forEach((id) => columnsSet.add(id));
    });

    return Array.from(this.sections.values()).filter(
      (section) => !columnsSet.has(section.id)
    );
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  /**
   * Serialize to JSON
   *
   * @returns Plain object representation
   */
  toJSON(): PlannerData {
    return {
      id: this.id,
      sections: Array.from(this.sections.values()).map((section) => section.toJSON()),
      columnsOrder: this.columnsOrder.map((column) => [...column]),
      orientation: this.orientation,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Serialize to storage format (PlannerState)
   *
   * @returns Storage-compatible state object
   */
  toState(): PlannerState {
    const sectionsRecord: Record<string, SectionData> = {};
    this.sections.forEach((section, id) => {
      sectionsRecord[id] = section.toJSON();
    });

    return {
      sections: sectionsRecord,
      columnsOrder: this.columnsOrder.map((column) => [...column]),
      orientation: this.orientation,
      version: this.version,
      lastModified: this.updatedAt,
    };
  }

  /**
   * Create Planner from JSON data
   *
   * @param json - JSON data
   * @returns New Planner instance
   * @throws {Error} If validation fails
   */
  static fromJSON(json: PlannerData): Planner {
    return new Planner(json);
  }

  /**
   * Create Planner from storage format (PlannerState)
   *
   * @param state - Storage state object
   * @returns New Planner instance
   * @throws {Error} If validation fails
   */
  static fromState(state: PlannerState): Planner {
    const sections = Object.values(state.sections).map((sectionData) =>
      Section.fromJSON(sectionData)
    );

    const timestamp = state.lastModified ?? Date.now();

    return new Planner({
      sections,
      columnsOrder: state.columnsOrder,
      orientation: state.orientation,
      version: state.version,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  /**
   * Clone the planner (creates a new planner with same data but new ID)
   *
   * @returns A new Planner instance
   */
  clone(): Planner {
    return new Planner({
      sections: this.getSections().map((section) => section.clone()),
      columnsOrder: this.columnsOrder.map((column) => [...column]),
      orientation: this.orientation,
      version: this.version,
    });
  }

  /**
   * Clone the planner with same ID (for copying)
   *
   * @returns A new Planner instance with same ID
   */
  cloneExact(): Planner {
    return new Planner({
      id: this.id,
      sections: this.getSections().map((section) => section.cloneExact()),
      columnsOrder: this.columnsOrder.map((column) => [...column]),
      orientation: this.orientation,
      version: this.version,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }

  /**
   * Compare two planners for equality
   *
   * @param other - Other planner to compare
   * @returns True if planners have same ID and data
   */
  equals(other: Planner): boolean {
    if (this.id !== other.id) return false;
    if (this.orientation !== other.orientation) return false;
    if (this.version !== other.version) return false;
    if (this.createdAt !== other.createdAt) return false;
    if (this.updatedAt !== other.updatedAt) return false;

    // Compare sections
    if (this.sections.size !== other.sections.size) return false;

    for (const [id, section] of this.sections) {
      const otherSection = other.sections.get(id);
      if (!otherSection || !section.equals(otherSection)) {
        return false;
      }
    }

    // Compare columnsOrder
    if (this.columnsOrder.length !== other.columnsOrder.length) return false;

    for (let i = 0; i < this.columnsOrder.length; i++) {
      const column = this.columnsOrder[i];
      const otherColumn = other.columnsOrder[i];

      if (!column || !otherColumn) return false;
      if (column.length !== otherColumn.length) return false;

      for (let j = 0; j < column.length; j++) {
        if (column[j] !== otherColumn[j]) return false;
      }
    }

    return true;
  }

  /**
   * Create a string representation of the planner
   *
   * @returns String representation
   */
  toString(): string {
    const sectionCount = this.getSectionCount();
    const columnCount = this.getColumnCount();
    return `Planner (${sectionCount} sections, ${columnCount} columns, ${this.orientation})`;
  }
}
