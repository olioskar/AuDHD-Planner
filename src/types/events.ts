/**
 * Event type definitions for the application's event bus
 */

import type { Section } from '../models/Section';
import type { Item } from '../models/Item';
import type { PlannerState } from './models';

/**
 * Map of all events in the application
 * Key: event name
 * Value: event data type
 */
export interface EventMap {
  // Section events
  'section:created': { section: Section };
  'section:updated': { section: Section };
  'section:deleted': { sectionId: string };
  'section:moved': { sectionId: string; fromColumn: number; toColumn: number };

  // Item events
  'item:created': { item: Item; sectionId: string };
  'item:updated': { item: Item; sectionId: string };
  'item:deleted': { itemId: string; sectionId: string };
  'item:moved': { itemId: string; fromSectionId: string; toSectionId: string };
  'item:checked': { itemId: string; checked: boolean };

  // State events
  'state:changed': { state: PlannerState };
  'state:loaded': { state: PlannerState };
  'state:saved': { state: PlannerState };
  'state:reset': Record<string, never>;

  // Drag events
  'drag:start': { type: 'section' | 'item'; id: string };
  'drag:end': { type: 'section' | 'item'; id: string };
  'drag:over': { type: 'section' | 'item'; id: string; targetId: string };

  // UI events
  'orientation:changed': { orientation: 'portrait' | 'landscape' };
  'print:requested': Record<string, never>;

  // Error events
  'error:occurred': { error: Error; context: string };
}

/**
 * Extract all possible event type names
 */
export type EventType = keyof EventMap;

/**
 * Type-safe event callback function
 */
export type EventCallback<T extends EventType> = (data: EventMap[T]) => void;

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  once?: boolean;
  priority?: number;
}

/**
 * Internal listener representation
 */
export interface EventListener<T extends EventType> {
  callback: EventCallback<T>;
  once: boolean;
  priority: number;
}

/**
 * Event history entry for debugging
 */
export interface EventHistoryEntry<T extends EventType = EventType> {
  type: T;
  timestamp: number;
  data: EventMap[T];
}
