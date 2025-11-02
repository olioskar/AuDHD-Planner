/**
 * EventBus tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '@core/EventBus';
import type { EventMap } from '@types/events';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on() and emit()', () => {
    it('should subscribe to an event and receive emitted data', () => {
      const callback = vi.fn();

      eventBus.on('section:created', callback);
      eventBus.emit('section:created', {
        section: { id: '1', title: 'Test' } as any,
      });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        section: { id: '1', title: 'Test' },
      });
    });

    it('should support multiple subscribers to the same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.on('state:changed', callback1);
      eventBus.on('state:changed', callback2);
      eventBus.emit('state:changed', { state: {} as any });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should not call callback for different events', () => {
      const callback = vi.fn();

      eventBus.on('section:created', callback);
      eventBus.emit('section:deleted', { sectionId: '1' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('once()', () => {
    it('should subscribe to an event only once', () => {
      const callback = vi.fn();

      eventBus.once('section:created', callback);

      eventBus.emit('section:created', { section: {} as any });
      eventBus.emit('section:created', { section: {} as any });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should auto-unsubscribe after first emission', () => {
      const callback = vi.fn();

      eventBus.once('state:changed', callback);
      expect(eventBus.listenerCount('state:changed')).toBe(1);

      eventBus.emit('state:changed', { state: {} as any });
      expect(eventBus.listenerCount('state:changed')).toBe(0);
    });
  });

  describe('off()', () => {
    it('should unsubscribe from an event', () => {
      const callback = vi.fn();

      eventBus.on('section:updated', callback);
      expect(eventBus.listenerCount('section:updated')).toBe(1);

      eventBus.off('section:updated', callback);
      expect(eventBus.listenerCount('section:updated')).toBe(0);

      eventBus.emit('section:updated', { section: {} as any });
      expect(callback).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function from on()', () => {
      const callback = vi.fn();

      const unsubscribe = eventBus.on('item:created', callback);
      expect(eventBus.listenerCount('item:created')).toBe(1);

      unsubscribe();
      expect(eventBus.listenerCount('item:created')).toBe(0);
    });

    it('should handle unsubscribing non-existent callback', () => {
      const callback = vi.fn();

      expect(() => {
        eventBus.off('section:created', callback);
      }).not.toThrow();
    });
  });

  describe('priority', () => {
    it('should call higher priority listeners first', () => {
      const order: number[] = [];

      eventBus.on('state:changed', () => order.push(1), { priority: 1 });
      eventBus.on('state:changed', () => order.push(3), { priority: 3 });
      eventBus.on('state:changed', () => order.push(2), { priority: 2 });

      eventBus.emit('state:changed', { state: {} as any });

      expect(order).toEqual([3, 2, 1]);
    });

    it('should default priority to 0', () => {
      const order: number[] = [];

      eventBus.on('state:changed', () => order.push(1), { priority: 1 });
      eventBus.on('state:changed', () => order.push(0)); // No priority = 0
      eventBus.on('state:changed', () => order.push(-1), { priority: -1 });

      eventBus.emit('state:changed', { state: {} as any });

      expect(order).toEqual([1, 0, -1]);
    });
  });

  describe('error handling', () => {
    it('should catch errors in listeners and continue execution', () => {
      const callback1 = vi.fn(() => {
        throw new Error('Test error');
      });
      const callback2 = vi.fn();

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.on('section:created', callback1);
      eventBus.on('section:created', callback2);

      eventBus.emit('section:created', { section: {} as any });

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('should emit error:occurred event for listener errors', () => {
      const errorCallback = vi.fn();
      eventBus.on('error:occurred', errorCallback);

      eventBus.on('section:created', () => {
        throw new Error('Test error');
      });

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.emit('section:created', { section: {} as any });

      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          context: expect.stringContaining('section:created'),
        })
      );

      consoleError.mockRestore();
    });
  });

  describe('clear()', () => {
    it('should remove all listeners', () => {
      eventBus.on('section:created', vi.fn());
      eventBus.on('section:updated', vi.fn());
      eventBus.on('item:created', vi.fn());

      expect(eventBus.eventNames().length).toBe(3);

      eventBus.clear();

      expect(eventBus.eventNames().length).toBe(0);
    });

    it('should clear event history', () => {
      eventBus.emit('section:created', { section: {} as any });
      eventBus.emit('section:updated', { section: {} as any });

      expect(eventBus.getHistory().length).toBe(2);

      eventBus.clear();

      expect(eventBus.getHistory().length).toBe(0);
    });
  });

  describe('clearEvent()', () => {
    it('should clear listeners for a specific event', () => {
      eventBus.on('section:created', vi.fn());
      eventBus.on('section:updated', vi.fn());

      eventBus.clearEvent('section:created');

      expect(eventBus.listenerCount('section:created')).toBe(0);
      expect(eventBus.listenerCount('section:updated')).toBe(1);
    });
  });

  describe('getHistory()', () => {
    it('should record event history', () => {
      eventBus.emit('section:created', { section: {} as any });
      eventBus.emit('section:updated', { section: {} as any });

      const history = eventBus.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0]?.type).toBe('section:created');
      expect(history[1]?.type).toBe('section:updated');
    });

    it('should filter history by event type', () => {
      eventBus.emit('section:created', { section: {} as any });
      eventBus.emit('section:updated', { section: {} as any });
      eventBus.emit('section:created', { section: {} as any });

      const history = eventBus.getHistory('section:created');

      expect(history).toHaveLength(2);
      expect(history.every((e) => e.type === 'section:created')).toBe(true);
    });

    it('should limit history size', () => {
      eventBus.setMaxHistorySize(5);

      for (let i = 0; i < 10; i++) {
        eventBus.emit('section:created', { section: {} as any });
      }

      expect(eventBus.getHistory().length).toBe(5);
    });

    it('should include timestamp in history', () => {
      const before = Date.now();
      eventBus.emit('section:created', { section: {} as any });
      const after = Date.now();

      const history = eventBus.getHistory();
      const timestamp = history[0]?.timestamp ?? 0;

      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('listenerCount()', () => {
    it('should return 0 for events with no listeners', () => {
      expect(eventBus.listenerCount('section:created')).toBe(0);
    });

    it('should return correct count for events with listeners', () => {
      eventBus.on('section:created', vi.fn());
      eventBus.on('section:created', vi.fn());
      eventBus.on('section:created', vi.fn());

      expect(eventBus.listenerCount('section:created')).toBe(3);
    });
  });

  describe('eventNames()', () => {
    it('should return array of all event names with listeners', () => {
      eventBus.on('section:created', vi.fn());
      eventBus.on('section:updated', vi.fn());
      eventBus.on('item:created', vi.fn());

      const names = eventBus.eventNames();

      expect(names).toContain('section:created');
      expect(names).toContain('section:updated');
      expect(names).toContain('item:created');
      expect(names).toHaveLength(3);
    });
  });

  describe('hasListeners()', () => {
    it('should return false for events with no listeners', () => {
      expect(eventBus.hasListeners('section:created')).toBe(false);
    });

    it('should return true for events with listeners', () => {
      eventBus.on('section:created', vi.fn());

      expect(eventBus.hasListeners('section:created')).toBe(true);
    });
  });

  describe('setMaxHistorySize()', () => {
    it('should update max history size', () => {
      eventBus.setMaxHistorySize(3);

      for (let i = 0; i < 5; i++) {
        eventBus.emit('section:created', { section: {} as any });
      }

      expect(eventBus.getHistory().length).toBe(3);
    });

    it('should trim existing history when reducing size', () => {
      for (let i = 0; i < 10; i++) {
        eventBus.emit('section:created', { section: {} as any });
      }

      eventBus.setMaxHistorySize(5);

      expect(eventBus.getHistory().length).toBe(5);
    });
  });

  describe('type safety', () => {
    it('should enforce correct event data types', () => {
      // This test verifies TypeScript compilation
      // The types are checked at compile-time

      eventBus.on('section:created', (data) => {
        // data should be typed as { section: Section }
        expect(data).toHaveProperty('section');
      });

      eventBus.on('item:checked', (data) => {
        // data should be typed as { itemId: string; checked: boolean }
        expect(data).toHaveProperty('itemId');
        expect(data).toHaveProperty('checked');
      });
    });
  });
});
