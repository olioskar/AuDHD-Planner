/**
 * Shared model type definitions
 */

/**
 * Item data structure
 */
export interface ItemData {
  id?: string;
  text?: string;
  checked?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Section data structure
 */
export interface SectionData {
  id?: string;
  title?: string;
  items?: ItemData[];
  isTextSection?: boolean;
  textContent?: string;
  placeholder?: string;
  columnIndex?: number;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Planner state structure
 */
export interface PlannerState {
  sections: Record<string, SectionData>;
  columnsOrder: string[][];
  orientation: 'portrait' | 'landscape';
  version?: string;
  lastModified?: number;
}

/**
 * Drag state
 */
export interface DragState {
  type: 'section' | 'item' | null;
  draggedId: string | null;
  sourceContainerId: string | null;
  isActive: boolean;
}

/**
 * Column data
 */
export interface ColumnData {
  index: number;
  sectionIds: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
