/**
 * StateService tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StateService } from '@/services/StateService';
import { EventBus } from '@core/EventBus';
import { MemoryAdapter } from '@/services/storage/MemoryAdapter';
import { Planner } from '@models/Planner';

describe('StateService', () => {
  let stateService: StateService;
  let eventBus: EventBus;
  let storage: MemoryAdapter;

  beforeEach(() => {
    eventBus = new EventBus();
    storage = new MemoryAdapter();
    stateService = new StateService({
      storageAdapter: storage,
      eventBus,
      storageKey: 'test-state',
      maxHistorySize: 10,
      autosave: false, // Disable autosave for tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create service with options', () => {
      expect(stateService).toBeInstanceOf(StateService);
    });
  });

  describe('setState() and getState()', () => {
    it('should set and get state', async () => {
      const planner = new Planner();

      await stateService.setState(planner);

      expect(stateService.getState()).toBe(planner);
    });

    it('should emit state:changed event', async () => {
      const planner = new Planner();
      const callback = vi.fn();

      eventBus.on('state:changed', callback);
      await stateService.setState(planner);

      expect(callback).toHaveBeenCalledWith({
        state: planner.toState(),
      });
    });

    it('should add to undo history', async () => {
      const planner1 = new Planner({ orientation: 'portrait' });
      const planner2 = new Planner({ orientation: 'landscape' });

      await stateService.setState(planner1);
      await stateService.setState(planner2, 'Changed orientation');

      expect(stateService.canUndo()).toBe(true);
    });

    it('should not add to history when addToHistory is false', async () => {
      const planner1 = new Planner();
      const planner2 = new Planner();

      await stateService.setState(planner1, undefined, false);
      await stateService.setState(planner2, undefined, false);

      expect(stateService.canUndo()).toBe(false);
    });
  });

  describe('loadState() and saveState()', () => {
    it('should save and load state', async () => {
      const planner = new Planner({ orientation: 'landscape' });
      planner.addSection({ title: 'Test Section' });

      await stateService.setState(planner);
      await stateService.saveState();

      // Create new service instance
      const newService = new StateService({
        storageAdapter: storage,
        eventBus,
        storageKey: 'test-state',
      });

      const loaded = await newService.loadState();

      expect(loaded).not.toBeNull();
      expect(loaded?.orientation).toBe('landscape');
      expect(loaded?.getSectionCount()).toBe(1);
    });

    it('should return null when no saved state exists', async () => {
      const loaded = await stateService.loadState();

      expect(loaded).toBeNull();
    });

    it('should emit state:loaded event on load', async () => {
      const planner = new Planner();
      await stateService.setState(planner);
      await stateService.saveState();

      const callback = vi.fn();
      eventBus.on('state:loaded', callback);

      await stateService.loadState();

      expect(callback).toHaveBeenCalled();
    });

    it('should emit state:saved event on save', async () => {
      const planner = new Planner();
      await stateService.setState(planner);

      const callback = vi.fn();
      eventBus.on('state:saved', callback);

      await stateService.saveState();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('resetState()', () => {
    it('should reset state and history', async () => {
      const planner1 = new Planner();
      const planner2 = new Planner();

      await stateService.setState(planner1);
      await stateService.setState(planner2);

      await stateService.resetState();

      expect(stateService.getState()).toBeNull();
      expect(stateService.canUndo()).toBe(false);
      expect(stateService.canRedo()).toBe(false);
    });

    it('should clear storage when requested', async () => {
      const planner = new Planner();
      await stateService.setState(planner);
      await stateService.saveState();

      await stateService.resetState(true);

      const loaded = await stateService.loadState();
      expect(loaded).toBeNull();
    });

    it('should emit state:reset event', async () => {
      const callback = vi.fn();
      eventBus.on('state:reset', callback);

      await stateService.resetState();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('undo() and redo()', () => {
    it('should undo state change', async () => {
      const planner1 = new Planner({ orientation: 'portrait' });
      const planner2 = new Planner({ orientation: 'landscape' });

      await stateService.setState(planner1);
      await stateService.setState(planner2);

      await stateService.undo();

      expect(stateService.getState()?.orientation).toBe('portrait');
    });

    it('should redo state change', async () => {
      const planner1 = new Planner({ orientation: 'portrait' });
      const planner2 = new Planner({ orientation: 'landscape' });

      await stateService.setState(planner1);
      await stateService.setState(planner2);

      await stateService.undo();
      await stateService.redo();

      expect(stateService.getState()?.orientation).toBe('landscape');
    });

    it('should emit state:undo event', async () => {
      const planner1 = new Planner();
      const planner2 = new Planner();

      await stateService.setState(planner1);
      await stateService.setState(planner2);

      const callback = vi.fn();
      eventBus.on('state:undo', callback);

      await stateService.undo();

      expect(callback).toHaveBeenCalled();
    });

    it('should emit state:redo event', async () => {
      const planner1 = new Planner();
      const planner2 = new Planner();

      await stateService.setState(planner1);
      await stateService.setState(planner2);
      await stateService.undo();

      const callback = vi.fn();
      eventBus.on('state:redo', callback);

      await stateService.redo();

      expect(callback).toHaveBeenCalled();
    });

    it('should return false when nothing to undo', async () => {
      const result = await stateService.undo();

      expect(result).toBe(false);
    });

    it('should return false when nothing to redo', async () => {
      const result = await stateService.redo();

      expect(result).toBe(false);
    });

    it('should clear redo stack on new change', async () => {
      const planner1 = new Planner({ orientation: 'portrait' });
      const planner2 = new Planner({ orientation: 'landscape' });
      const planner3 = new Planner({ version: '3.0.0' });

      await stateService.setState(planner1);
      await stateService.setState(planner2);
      await stateService.undo();

      // New change should clear redo stack
      await stateService.setState(planner3);

      expect(stateService.canRedo()).toBe(false);
    });
  });

  describe('canUndo() and canRedo()', () => {
    it('should return correct undo availability', async () => {
      expect(stateService.canUndo()).toBe(false);

      const planner1 = new Planner();
      const planner2 = new Planner();

      await stateService.setState(planner1);
      expect(stateService.canUndo()).toBe(false);

      await stateService.setState(planner2);
      expect(stateService.canUndo()).toBe(true);
    });

    it('should return correct redo availability', async () => {
      const planner1 = new Planner();
      const planner2 = new Planner();

      await stateService.setState(planner1);
      await stateService.setState(planner2);

      expect(stateService.canRedo()).toBe(false);

      await stateService.undo();
      expect(stateService.canRedo()).toBe(true);
    });
  });

  describe('history management', () => {
    it('should respect maxHistorySize', async () => {
      const service = new StateService({
        storageAdapter: storage,
        eventBus,
        maxHistorySize: 3,
      });

      // Add 5 changes
      for (let i = 0; i < 5; i++) {
        await service.setState(new Planner({ version: `${i}.0.0` }));
      }

      const history = service.getUndoHistory();
      expect(history.length).toBeLessThanOrEqual(3);
    });

    it('should get undo history', async () => {
      const planner1 = new Planner();
      const planner2 = new Planner();

      await stateService.setState(planner1);
      await stateService.setState(planner2, 'Test change');

      const history = stateService.getUndoHistory();

      expect(history.length).toBe(1);
      expect(history[0]?.description).toBe('Test change');
    });

    it('should clear history', async () => {
      const planner1 = new Planner();
      const planner2 = new Planner();

      await stateService.setState(planner1);
      await stateService.setState(planner2);

      stateService.clearHistory();

      expect(stateService.canUndo()).toBe(false);
      expect(stateService.canRedo()).toBe(false);
    });
  });

  describe('autosave', () => {
    it('should autosave after setState when enabled', async () => {
      vi.useFakeTimers();

      const autoService = new StateService({
        storageAdapter: storage,
        eventBus,
        storageKey: 'auto-test',
        autosave: true,
        autosaveDelay: 100,
      });

      const planner = new Planner();
      await autoService.setState(planner);

      // Fast-forward time
      vi.advanceTimersByTime(150);

      // Check if saved (allow async operations to complete)
      await vi.runAllTimersAsync();

      const loaded = await storage.load('auto-test');
      expect(loaded).not.toBeNull();
    });

    it('should enable/disable autosave', () => {
      stateService.setAutosave(true);
      expect(stateService.isAutosaveEnabled()).toBe(true);

      stateService.setAutosave(false);
      expect(stateService.isAutosaveEnabled()).toBe(false);
    });

    it('should force save immediately', async () => {
      const planner = new Planner();
      await stateService.setState(planner);

      await stateService.forceSave();

      const loaded = await storage.load('test-state');
      expect(loaded).not.toBeNull();
    });
  });

  describe('import/export', () => {
    it('should export state as JSON', async () => {
      const planner = new Planner({ orientation: 'landscape' });
      await stateService.setState(planner);

      const exported = stateService.exportState();

      expect(exported).not.toBeNull();
      expect(exported).toContain('landscape');
    });

    it('should return null when no state to export', () => {
      const exported = stateService.exportState();

      expect(exported).toBeNull();
    });

    it('should import state from JSON', async () => {
      const planner = new Planner({ orientation: 'landscape' });
      const json = JSON.stringify(planner.toState());

      await stateService.importState(json);

      expect(stateService.getState()?.orientation).toBe('landscape');
    });

    it('should throw on invalid JSON import', async () => {
      await expect(stateService.importState('invalid json{')).rejects.toThrow();
    });

    it('should add imported state to history by default', async () => {
      const planner1 = new Planner();
      await stateService.setState(planner1);

      const planner2 = new Planner({ orientation: 'landscape' });
      const json = JSON.stringify(planner2.toState());

      await stateService.importState(json);

      expect(stateService.canUndo()).toBe(true);
    });
  });

  describe('storage info', () => {
    it('should get storage size info', async () => {
      const info = await stateService.getStorageInfo();

      expect(info).not.toBeNull();
      expect(info?.used).toBeGreaterThanOrEqual(0);
      expect(info?.available).toBeGreaterThan(0);
    });
  });
});
