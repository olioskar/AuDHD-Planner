/**
 * Central event bus for application-wide communication
 * Implements the Observer pattern for loose coupling between components
 */

import type {
  EventType,
  EventCallback,
  EventMap,
  EventListener,
  EventSubscriptionOptions,
  EventHistoryEntry,
} from '@types/events';

export class EventBus {
  private listeners = new Map<EventType, EventListener<EventType>[]>();
  private eventHistory: EventHistoryEntry[] = [];
  private maxHistorySize = 100;

  /**
   * Subscribe to an event with full type safety
   *
   * @param event - The event name to subscribe to
   * @param callback - Handler function to call when event is emitted
   * @param options - Subscription options (once, priority)
   * @returns Unsubscribe function
   *
   * @example
   * const unsubscribe = eventBus.on('section:created', (data) => {
   *   console.log(data.section.title);
   * });
   */
  on<T extends EventType>(
    event: T,
    callback: EventCallback<T>,
    options: EventSubscriptionOptions = {}
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener: EventListener<T> = {
      callback,
      once: options.once ?? false,
      priority: options.priority ?? 0,
    };

    const eventListeners = this.listeners.get(event)!;
    eventListeners.push(listener as EventListener<EventType>);

    // Sort by priority (higher priority first)
    eventListeners.sort((a, b) => b.priority - a.priority);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Subscribe to an event once
   * Automatically unsubscribes after the first emission
   *
   * @param event - The event name to subscribe to
   * @param callback - Handler function to call when event is emitted
   * @returns Unsubscribe function
   */
  once<T extends EventType>(event: T, callback: EventCallback<T>): () => void {
    return this.on(event, callback, { once: true });
  }

  /**
   * Unsubscribe from an event
   *
   * @param event - The event name to unsubscribe from
   * @param callback - The callback function to remove
   */
  off<T extends EventType>(event: T, callback: EventCallback<T>): void {
    const listeners = this.listeners.get(event);
    if (!listeners) return;

    const index = listeners.findIndex((l) => l.callback === callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }

    // Clean up empty listener arrays
    if (listeners.length === 0) {
      this.listeners.delete(event);
    }
  }

  /**
   * Emit an event with type-safe data
   * All subscribed listeners will be called with the provided data
   *
   * @param event - The event name to emit
   * @param data - The event data (type-checked against EventMap)
   *
   * @example
   * eventBus.emit('section:created', { section: mySection });
   */
  emit<T extends EventType>(event: T, data: EventMap[T]): void {
    // Store in history for debugging
    const historyEntry: EventHistoryEntry<T> = {
      type: event,
      timestamp: Date.now(),
      data,
    };

    this.eventHistory.push(historyEntry);

    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    const listeners = this.listeners.get(event);
    if (!listeners || listeners.length === 0) return;

    // Create a copy to avoid issues if listeners modify the array
    const listenersCopy = [...listeners];

    listenersCopy.forEach((listener) => {
      try {
        listener.callback(data);

        // Remove one-time listeners
        if (listener.once) {
          this.off(event, listener.callback);
        }
      } catch (error) {
        console.error(`Error in event listener for "${event}":`, error);
        // Emit error event if this isn't already an error event
        if (event !== 'error:occurred') {
          this.emit('error:occurred', {
            error: error instanceof Error ? error : new Error(String(error)),
            context: `Event listener for "${event}"`,
          });
        }
      }
    });
  }

  /**
   * Clear all listeners
   * Useful for testing and cleanup
   */
  clear(): void {
    this.listeners.clear();
    this.eventHistory = [];
  }

  /**
   * Clear listeners for a specific event
   *
   * @param event - The event name to clear listeners for
   */
  clearEvent<T extends EventType>(event: T): void {
    this.listeners.delete(event);
  }

  /**
   * Get event history for debugging
   *
   * @param eventType - Optional event type to filter by
   * @returns Array of event history entries
   */
  getHistory<T extends EventType>(eventType?: T): EventHistoryEntry[] {
    if (eventType) {
      return this.eventHistory.filter((e) => e.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * Get count of listeners for an event
   *
   * @param event - The event name to check
   * @returns Number of listeners subscribed to this event
   */
  listenerCount<T extends EventType>(event: T): number {
    return this.listeners.get(event)?.length ?? 0;
  }

  /**
   * Get all event names that have listeners
   *
   * @returns Array of event names
   */
  eventNames(): EventType[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Check if an event has any listeners
   *
   * @param event - The event name to check
   * @returns True if the event has at least one listener
   */
  hasListeners<T extends EventType>(event: T): boolean {
    return this.listenerCount(event) > 0;
  }

  /**
   * Set maximum history size
   *
   * @param size - Maximum number of history entries to keep
   */
  setMaxHistorySize(size: number): void {
    this.maxHistorySize = size;

    // Trim existing history if needed
    if (this.eventHistory.length > size) {
      this.eventHistory = this.eventHistory.slice(-size);
    }
  }
}

/**
 * Singleton instance of EventBus
 * Use this throughout the application
 */
export const eventBus = new EventBus();
