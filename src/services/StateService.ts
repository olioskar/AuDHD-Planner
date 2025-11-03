/**
 * State management service with undo/redo functionality
 * Manages application state persistence and history
 */

import type { EventBus } from '@core/EventBus';
import type { Planner } from '@models/Planner';
import type { PlannerState } from '@types/models';
import type { IStorageAdapter } from './storage/IStorageAdapter';
import { Planner as PlannerModel } from '@models/Planner';

/**
 * State history entry
 */
interface StateHistoryEntry {
  state: PlannerState;
  timestamp: number;
  description?: string;
}

/**
 * State service options
 */
export interface StateServiceOptions {
  /** Storage adapter to use */
  storageAdapter: IStorageAdapter;
  /** EventBus instance */
  eventBus: EventBus;
  /** Storage key for main state */
  storageKey?: string;
  /** Maximum undo history size */
  maxHistorySize?: number;
  /** Autosave enabled */
  autosave?: boolean;
  /** Autosave debounce delay in ms */
  autosaveDelay?: number;
}

/**
 * State management service
 *
 * Features:
 * - State persistence via storage adapters
 * - Undo/redo with configurable history size
 * - Autosave with debouncing
 * - Event emission on state changes
 *
 * @example
 * ```typescript
 * const service = new StateService({
 *   storageAdapter: new LocalStorageAdapter(),
 *   eventBus,
 *   maxHistorySize: 50,
 * });
 *
 * await service.setState(planner);
 * await service.undo();
 * await service.redo();
 * ```
 */
export class StateService {
  private storage: IStorageAdapter;
  private eventBus: EventBus;
  private storageKey: string;
  private maxHistorySize: number;
  private autosaveEnabled: boolean;
  private autosaveDelay: number;

  private currentPlanner: Planner | null = null;
  private undoStack: StateHistoryEntry[] = [];
  private redoStack: StateHistoryEntry[] = [];
  private autosaveTimer: number | null = null;
  private isSaving = false;

  /**
   * Create a new StateService
   *
   * @param options - Service configuration
   */
  constructor(options: StateServiceOptions) {
    this.storage = options.storageAdapter;
    this.eventBus = options.eventBus;
    this.storageKey = options.storageKey ?? 'planner-state';
    this.maxHistorySize = options.maxHistorySize ?? 50;
    this.autosaveEnabled = options.autosave ?? true;
    this.autosaveDelay = options.autosaveDelay ?? 1000;
  }

  /**
   * Get the current planner state
   *
   * @returns Current planner or null
   */
  getState(): Planner | null {
    return this.currentPlanner;
  }

  /**
   * Set the current state and add to history
   *
   * @param planner - New planner state
   * @param description - Optional description for history
   * @param addToHistory - Whether to add to undo history (default: true)
   */
  async setState(
    planner: Planner,
    description?: string,
    addToHistory = true
  ): Promise<void> {
    // Add current state to undo stack before updating
    if (addToHistory && this.currentPlanner) {
      this.addToUndoStack({
        state: this.currentPlanner.toState(),
        timestamp: Date.now(),
        description: description ?? 'State change',
      });
      // Clear redo stack on new change
      this.redoStack = [];
    }

    this.currentPlanner = planner;

    // Emit state change event
    this.eventBus.emit('state:changed', {
      state: planner.toState(),
    });

    // Trigger autosave if enabled
    if (this.autosaveEnabled && !this.isSaving) {
      this.scheduleAutosave();
    }
  }

  /**
   * Load state from storage
   *
   * @returns Loaded planner or null if not found
   */
  async loadState(): Promise<Planner | null> {
    try {
      const state = await this.storage.load<PlannerState>(this.storageKey);

      if (!state) {
        return null;
      }

      const planner = PlannerModel.fromState(state);
      this.currentPlanner = planner;

      // Don't add to history or trigger autosave on load
      this.eventBus.emit('state:loaded', { state });

      return planner;
    } catch (error) {
      this.eventBus.emit('state:error', {
        error: error instanceof Error ? error.message : 'Failed to load state',
      });
      throw error;
    }
  }

  /**
   * Save current state to storage
   *
   * @throws {StorageError} If save fails
   */
  async saveState(): Promise<void> {
    if (!this.currentPlanner) {
      return;
    }

    this.isSaving = true;

    try {
      const state = this.currentPlanner.toState();
      await this.storage.save(this.storageKey, state);

      this.eventBus.emit('state:saved', { state });
    } catch (error) {
      this.eventBus.emit('state:error', {
        error: error instanceof Error ? error.message : 'Failed to save state',
      });
      throw error;
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Reset state (clear current state and history)
   *
   * @param clearStorage - Whether to clear storage (default: true)
   */
  async resetState(clearStorage = true): Promise<void> {
    this.currentPlanner = null;
    this.undoStack = [];
    this.redoStack = [];

    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    if (clearStorage) {
      await this.storage.remove(this.storageKey);
    }

    this.eventBus.emit('state:reset', {});
  }

  /**
   * Undo the last change
   *
   * @returns True if undo was performed
   */
  async undo(): Promise<boolean> {
    if (this.undoStack.length === 0) {
      return false;
    }

    // Save current state to redo stack
    if (this.currentPlanner) {
      this.redoStack.push({
        state: this.currentPlanner.toState(),
        timestamp: Date.now(),
        description: 'Redo point',
      });
    }

    // Pop from undo stack
    const entry = this.undoStack.pop();
    if (!entry) {
      return false;
    }

    // Restore state
    this.currentPlanner = PlannerModel.fromState(entry.state);

    // Emit event
    this.eventBus.emit('state:undo', {
      state: entry.state,
    });

    // Trigger autosave
    if (this.autosaveEnabled) {
      this.scheduleAutosave();
    }

    return true;
  }

  /**
   * Redo the last undone change
   *
   * @returns True if redo was performed
   */
  async redo(): Promise<boolean> {
    if (this.redoStack.length === 0) {
      return false;
    }

    // Save current state to undo stack
    if (this.currentPlanner) {
      this.undoStack.push({
        state: this.currentPlanner.toState(),
        timestamp: Date.now(),
        description: 'Undo point',
      });
    }

    // Pop from redo stack
    const entry = this.redoStack.pop();
    if (!entry) {
      return false;
    }

    // Restore state
    this.currentPlanner = PlannerModel.fromState(entry.state);

    // Emit event
    this.eventBus.emit('state:redo', {
      state: entry.state,
    });

    // Trigger autosave
    if (this.autosaveEnabled) {
      this.scheduleAutosave();
    }

    return true;
  }

  /**
   * Check if undo is available
   *
   * @returns True if can undo
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   *
   * @returns True if can redo
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get undo history
   *
   * @returns Array of history entries
   */
  getUndoHistory(): ReadonlyArray<Readonly<StateHistoryEntry>> {
    return this.undoStack;
  }

  /**
   * Get redo history
   *
   * @returns Array of history entries
   */
  getRedoHistory(): ReadonlyArray<Readonly<StateHistoryEntry>> {
    return this.redoStack;
  }

  /**
   * Clear undo/redo history
   */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Enable or disable autosave
   *
   * @param enabled - Whether autosave should be enabled
   */
  setAutosave(enabled: boolean): void {
    this.autosaveEnabled = enabled;

    if (!enabled && this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  /**
   * Check if autosave is enabled
   *
   * @returns True if autosave is enabled
   */
  isAutosaveEnabled(): boolean {
    return this.autosaveEnabled;
  }

  /**
   * Force an immediate save (bypasses debouncing)
   */
  async forceSave(): Promise<void> {
    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    await this.saveState();
  }

  /**
   * Add entry to undo stack with size limit management
   *
   * @param entry - History entry to add
   */
  private addToUndoStack(entry: StateHistoryEntry): void {
    this.undoStack.push(entry);

    // Trim history if exceeds max size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  /**
   * Schedule an autosave with debouncing
   */
  private scheduleAutosave(): void {
    if (this.autosaveTimer !== null) {
      clearTimeout(this.autosaveTimer);
    }

    this.autosaveTimer = setTimeout(() => {
      this.saveState().catch((error) => {
        console.error('Autosave failed:', error);
      });
    }, this.autosaveDelay) as unknown as number;
  }

  /**
   * Export state as JSON string
   *
   * @returns JSON string of current state
   */
  exportState(): string | null {
    if (!this.currentPlanner) {
      return null;
    }

    return JSON.stringify(this.currentPlanner.toState(), null, 2);
  }

  /**
   * Import state from JSON string
   *
   * @param json - JSON string to import
   * @param addToHistory - Whether to add to undo history
   * @throws {Error} If JSON is invalid
   */
  async importState(json: string, addToHistory = true): Promise<void> {
    try {
      const state = JSON.parse(json) as PlannerState;
      const planner = PlannerModel.fromState(state);
      await this.setState(planner, 'Imported state', addToHistory);
    } catch (error) {
      throw new Error(
        `Failed to import state: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }
  }

  /**
   * Get storage statistics
   *
   * @returns Storage size info if available
   */
  async getStorageInfo(): Promise<{ used: number; available: number } | null> {
    return await this.storage.getSize();
  }
}
