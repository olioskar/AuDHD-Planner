/**
 * Header component
 * Top-level actions and controls
 */

import { Component } from '@core/Component';
import type { EventBus } from '@core/EventBus';

/**
 * Header component state
 */
export interface HeaderComponentState {
  orientation: 'portrait' | 'landscape';
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Header component options
 */
export interface HeaderComponentOptions {
  eventBus: EventBus;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Header component
 *
 * Features:
 * - Add section button
 * - Orientation toggle (portrait/landscape)
 * - Print button
 * - Undo/redo buttons
 * - Reset button
 *
 * @example
 * ```typescript
 * const header = new HeaderComponent({
 *   eventBus,
 *   orientation: 'portrait',
 * });
 * header.mount(container);
 * ```
 */
export class HeaderComponent extends Component<HeaderComponentState> {
  constructor(options: HeaderComponentOptions) {
    super(options.eventBus, {
      orientation: options.orientation ?? 'portrait',
      canUndo: false,
      canRedo: false,
    });
  }

  /**
   * Called when component is mounted
   */
  protected onMount(): void {
    // Listen for orientation changes
    this.subscribe('orientation:changed', (data) => {
      this.setState({ orientation: data.orientation });
    });

    // Listen for state changes to update undo/redo availability
    this.subscribe('state:changed', () => {
      this.updateUndoRedoState();
    });

    this.subscribe('state:undo', () => {
      this.updateUndoRedoState();
    });

    this.subscribe('state:redo', () => {
      this.updateUndoRedoState();
    });
  }

  /**
   * Render the component
   */
  protected render(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'app-header';

    // Title
    const title = document.createElement('h1');
    title.className = 'app-header__title';
    title.textContent = 'AuDHD Planner';
    header.appendChild(title);

    // Actions container
    const actions = document.createElement('div');
    actions.className = 'app-header__actions';

    // Add section button
    const addSectionBtn = this.createButton(
      'Add Section',
      'app-header__btn app-header__btn--primary',
      () => this.handleAddSection()
    );
    actions.appendChild(addSectionBtn);

    // Orientation toggle
    const orientationBtn = this.createButton(
      this.state.orientation === 'portrait' ? '📄 Portrait' : '📃 Landscape',
      'app-header__btn',
      () => this.handleOrientationToggle()
    );
    actions.appendChild(orientationBtn);

    // Undo button
    const undoBtn = this.createButton(
      '↶ Undo',
      'app-header__btn',
      () => this.handleUndo(),
      !this.state.canUndo
    );
    actions.appendChild(undoBtn);

    // Redo button
    const redoBtn = this.createButton(
      '↷ Redo',
      'app-header__btn',
      () => this.handleRedo(),
      !this.state.canRedo
    );
    actions.appendChild(redoBtn);

    // Print button
    const printBtn = this.createButton(
      '🖨 Print',
      'app-header__btn',
      () => this.handlePrint()
    );
    actions.appendChild(printBtn);

    // Reset button
    const resetBtn = this.createButton(
      '🔄 Reset',
      'app-header__btn app-header__btn--danger',
      () => this.handleReset()
    );
    actions.appendChild(resetBtn);

    header.appendChild(actions);

    return header;
  }

  /**
   * Create a button element
   */
  private createButton(
    text: string,
    className: string,
    onClick: () => void,
    disabled = false
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = className;
    button.textContent = text;
    button.type = 'button';
    button.disabled = disabled;

    button.addEventListener('click', onClick);

    return button;
  }

  /**
   * Handle add section button click
   */
  private handleAddSection(): void {
    this.eventBus.emit('section:created', {
      section: null as any, // Will be created by PlannerComponent
    });
  }

  /**
   * Handle orientation toggle
   */
  private handleOrientationToggle(): void {
    const newOrientation = this.state.orientation === 'portrait' ? 'landscape' : 'portrait';

    this.eventBus.emit('orientation:changed', {
      orientation: newOrientation,
    });

    this.setState({ orientation: newOrientation });
  }

  /**
   * Handle undo button click
   */
  private handleUndo(): void {
    if (this.state.canUndo) {
      // StateService will handle this
      this.eventBus.emit('state:undo', {
        state: null as any,
      });
    }
  }

  /**
   * Handle redo button click
   */
  private handleRedo(): void {
    if (this.state.canRedo) {
      // StateService will handle this
      this.eventBus.emit('state:redo', {
        state: null as any,
      });
    }
  }

  /**
   * Handle print button click
   */
  private handlePrint(): void {
    this.eventBus.emit('print:start', {
      options: {
        orientation: this.state.orientation,
        preview: true,
      },
    });
  }

  /**
   * Handle reset button click
   */
  private handleReset(): void {
    const confirmed = confirm('Are you sure you want to reset all data? This cannot be undone.');

    if (confirmed) {
      this.eventBus.emit('state:reset', {});
    }
  }

  /**
   * Update undo/redo button states
   * This would typically query the StateService
   */
  private updateUndoRedoState(): void {
    // In a real implementation, we'd get this from StateService
    // For now, we'll just toggle based on events
    // The actual implementation would require access to StateService
  }

  /**
   * Set undo/redo availability (called externally)
   */
  setUndoRedo(canUndo: boolean, canRedo: boolean): void {
    this.setState({ canUndo, canRedo });
  }
}
