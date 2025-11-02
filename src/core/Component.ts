/**
 * Base class for all UI components
 * Provides lifecycle methods, state management, and event handling
 */

import type { EventBus } from './EventBus';
import type { EventType, EventCallback, EventSubscriptionOptions } from '@types/events';

/**
 * HTML element attributes type
 */
type ElementAttributes = Record<string, string | number | boolean | Record<string, string>>;

/**
 * Component state type - can be extended by child components
 */
export type ComponentState = Record<string, unknown>;

/**
 * Base Component class
 * All UI components should extend this class
 *
 * @example
 * class MyComponent extends Component<{ count: number }> {
 *   render() {
 *     return this.createElement('div', {}, [`Count: ${this.state.count}`]);
 *   }
 * }
 */
export abstract class Component<TState extends ComponentState = ComponentState> {
  protected eventBus: EventBus;
  protected element: HTMLElement | null = null;
  protected listeners: Array<() => void> = [];
  protected state: TState;
  protected mounted = false;
  protected domListeners: Array<{
    element: HTMLElement;
    event: string;
    handler: EventListener;
  }> = [];

  constructor(eventBus: EventBus, initialState: TState = {} as TState) {
    this.eventBus = eventBus;
    this.state = initialState;
  }

  /**
   * Lifecycle: Create the DOM element
   * Must be implemented by child classes
   *
   * @returns The root HTMLElement for this component
   */
  protected abstract render(): HTMLElement;

  /**
   * Lifecycle: Component mounted to DOM
   * Override to set up event listeners, subscriptions, etc.
   */
  protected onMount(): void {
    // Override in child classes
  }

  /**
   * Lifecycle: Component will be removed from DOM
   * Override to clean up
   */
  protected onUnmount(): void {
    // Override in child classes
  }

  /**
   * Mount the component to a parent element
   *
   * @param parent - The parent HTMLElement to mount to
   * @returns The mounted element
   */
  mount(parent: HTMLElement): HTMLElement {
    if (this.mounted) {
      console.warn('Component already mounted');
      return this.element!;
    }

    this.element = this.render();
    parent.appendChild(this.element);
    this.mounted = true;
    this.onMount();

    return this.element;
  }

  /**
   * Unmount the component
   * Cleans up all event subscriptions and DOM listeners
   */
  unmount(): void {
    if (!this.mounted) return;

    this.onUnmount();

    // Clean up all event bus subscriptions
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners = [];

    // Clean up all DOM event listeners
    this.domListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.domListeners = [];

    // Remove from DOM
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.mounted = false;
    this.element = null;
  }

  /**
   * Subscribe to event bus events
   * Automatically cleaned up on unmount
   *
   * @param event - The event name to subscribe to
   * @param callback - Handler function
   * @param options - Subscription options
   * @returns Unsubscribe function
   */
  protected subscribe<T extends EventType>(
    event: T,
    callback: EventCallback<T>,
    options?: EventSubscriptionOptions
  ): () => void {
    const unsubscribe = this.eventBus.on(event, callback, options);
    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * Update component state and optionally re-render
   *
   * @param partialState - Partial state to merge
   * @param shouldRerender - Whether to re-render (default: true)
   */
  protected setState(partialState: Partial<TState>, shouldRerender = true): void {
    this.state = { ...this.state, ...partialState };

    if (shouldRerender && this.mounted) {
      this.update();
    }
  }

  /**
   * Get current state
   *
   * @returns Current state object
   */
  protected getState(): Readonly<TState> {
    return this.state;
  }

  /**
   * Update the component (re-render in place)
   * Preserves position in DOM
   */
  protected update(): void {
    if (!this.mounted || !this.element) return;

    const parent = this.element.parentNode;
    const nextSibling = this.element.nextSibling;

    // Clean up current element
    this.onUnmount();
    this.element.remove();

    // Clear DOM listeners but keep event bus subscriptions
    this.domListeners = [];

    // Render new element
    this.element = this.render();

    // Re-insert into DOM
    if (nextSibling && parent) {
      parent.insertBefore(this.element, nextSibling);
    } else if (parent) {
      parent.appendChild(this.element);
    }

    // Re-mount
    this.onMount();
  }

  /**
   * Helper: Create element with attributes and children
   *
   * @param tag - HTML tag name
   * @param attrs - Element attributes
   * @param children - Child elements or text
   * @returns Created HTMLElement
   */
  protected createElement(
    tag: string,
    attrs: ElementAttributes = {},
    children: (HTMLElement | string)[] = []
  ): HTMLElement {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className' && typeof value === 'string') {
        element.className = value;
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = String(dataValue);
        });
      } else if (key.startsWith('on') && typeof value === 'function') {
        // Don't use this - prefer addEventListener
        console.warn('Use addEventListener instead of on* attributes');
      } else {
        element.setAttribute(key, String(value));
      }
    });

    // Add children
    children.forEach((child) => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      }
    });

    return element;
  }

  /**
   * Helper: Add DOM event listener that will be auto-cleaned on unmount
   *
   * @param element - Element to attach listener to
   * @param event - Event name
   * @param handler - Event handler
   * @param options - Event listener options
   */
  protected addEventListener(
    element: HTMLElement,
    event: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    element.addEventListener(event, handler, options);
    this.domListeners.push({ element, event, handler });
  }

  /**
   * Helper: Query selector within component element
   *
   * @param selector - CSS selector
   * @returns Found element or null
   */
  protected query<T extends HTMLElement = HTMLElement>(selector: string): T | null {
    if (!this.element) return null;
    return this.element.querySelector<T>(selector);
  }

  /**
   * Helper: Query selector all within component element
   *
   * @param selector - CSS selector
   * @returns NodeList of found elements
   */
  protected queryAll<T extends HTMLElement = HTMLElement>(selector: string): NodeListOf<T> {
    if (!this.element) return document.querySelectorAll<T>('nothing');
    return this.element.querySelectorAll<T>(selector);
  }

  /**
   * Check if component is mounted
   *
   * @returns True if mounted
   */
  isMounted(): boolean {
    return this.mounted;
  }

  /**
   * Get the root element
   *
   * @returns The root HTMLElement or null if not mounted
   */
  getElement(): HTMLElement | null {
    return this.element;
  }
}
