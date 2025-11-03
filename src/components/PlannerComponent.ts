/**
 * Planner component
 * Root component that manages the entire application UI
 */

import { Component } from '@core/Component';
import type { EventBus } from '@core/EventBus';
import type { Planner as PlannerModel } from '@models/Planner';
import type { StateService } from '@/services/StateService';
import { SectionComponent } from './SectionComponent';
import { HeaderComponent } from './HeaderComponent';

/**
 * Planner component state
 */
export interface PlannerComponentState {
  planner: PlannerModel;
  orientation: 'portrait' | 'landscape';
}

/**
 * Planner component options
 */
export interface PlannerComponentOptions {
  planner: PlannerModel;
  stateService: StateService;
  eventBus: EventBus;
}

/**
 * Planner component
 *
 * Features:
 * - Multi-column layout
 * - Section management
 * - Drag and drop coordination
 * - State synchronization
 *
 * @example
 * ```typescript
 * const planner = new PlannerComponent({
 *   planner: plannerModel,
 *   stateService,
 *   eventBus,
 * });
 * planner.mount(document.body);
 * ```
 */
export class PlannerComponent extends Component<PlannerComponentState> {
  private planner: PlannerModel;
  private stateService: StateService;
  private headerComponent: HeaderComponent | null = null;
  private sectionComponents: Map<string, SectionComponent> = new Map();

  constructor(options: PlannerComponentOptions) {
    super(options.eventBus, {
      planner: options.planner,
      orientation: options.planner.orientation,
    });

    this.planner = options.planner;
    this.stateService = options.stateService;
  }

  /**
   * Called when component is mounted
   */
  protected onMount(): void {
    // Listen for section events
    this.subscribe('section:created', (data) => {
      if (!data.section) {
        // Create new section
        const section = this.planner.addSection({ title: 'New Section' });
        this.planner.addSectionToColumn(section.id, 0);
        this.saveState('Added section');
        this.rerender();
      }
    });

    this.subscribe('section:deleted', (data) => {
      this.planner.removeSection(data.sectionId);
      this.saveState('Deleted section');
      this.rerender();
    });

    this.subscribe('section:updated', (data) => {
      const section = this.planner.getSection(data.section.id);
      if (section) {
        this.saveState('Updated section');
      }
    });

    // Listen for item events
    this.subscribe('item:updated', () => {
      this.saveState('Updated item');
    });

    this.subscribe('item:deleted', (data) => {
      const section = this.planner.getSection(data.sectionId);
      if (section) {
        section.removeItem(data.itemId);
        this.saveState('Deleted item');
      }
    });

    this.subscribe('item:checked', () => {
      this.saveState('Toggled item');
    });

    // Listen for orientation changes
    this.subscribe('orientation:changed', (data) => {
      this.planner.update({ orientation: data.orientation });
      this.setState({ orientation: data.orientation });
      this.saveState('Changed orientation');
    });

    // Listen for state events
    this.subscribe('state:undo', async () => {
      const success = await this.stateService.undo();
      if (success) {
        const newPlanner = this.stateService.getState();
        if (newPlanner) {
          this.planner = newPlanner;
          this.setState({ planner: newPlanner, orientation: newPlanner.orientation });
        }
      }
    });

    this.subscribe('state:redo', async () => {
      const success = await this.stateService.redo();
      if (success) {
        const newPlanner = this.stateService.getState();
        if (newPlanner) {
          this.planner = newPlanner;
          this.setState({ planner: newPlanner, orientation: newPlanner.orientation });
        }
      }
    });

    this.subscribe('state:reset', async () => {
      await this.stateService.resetState();
      // Create new empty planner
      this.planner = new (this.planner.constructor as typeof PlannerModel)();
      this.setState({ planner: this.planner, orientation: this.planner.orientation });
    });

    // Listen for print events
    this.subscribe('print:start', async () => {
      // PrintService will be handled externally
      // This is just a placeholder
      window.print();
    });

    // Update header undo/redo state
    this.updateHeaderUndoRedo();
  }

  /**
   * Called when component is unmounted
   */
  protected onUnmount(): void {
    // Clean up section components
    this.sectionComponents.forEach((comp) => comp.unmount());
    this.sectionComponents.clear();

    // Clean up header
    this.headerComponent?.unmount();
    this.headerComponent = null;
  }

  /**
   * Render the component
   */
  protected render(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'planner';
    container.setAttribute('data-orientation', this.state.orientation);

    // Render header
    const headerContainer = document.createElement('div');
    headerContainer.className = 'planner__header-container';

    this.headerComponent = new HeaderComponent({
      eventBus: this.eventBus,
      orientation: this.state.orientation,
    });

    this.headerComponent.mount(headerContainer);
    container.appendChild(headerContainer);

    // Render columns
    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'planner__columns';

    const columnCount = this.planner.getColumnCount();

    for (let i = 0; i < columnCount; i++) {
      const column = this.createColumn(i);
      columnsContainer.appendChild(column);
    }

    container.appendChild(columnsContainer);

    return container;
  }

  /**
   * Create a column element
   */
  private createColumn(columnIndex: number): HTMLElement {
    const column = document.createElement('div');
    column.className = 'planner__column';
    column.setAttribute('data-column', `${columnIndex}`);

    // Get sections in this column
    const sections = this.planner.getSectionsInColumn(columnIndex);

    // Render sections
    sections.forEach((section) => {
      const sectionComponent = new SectionComponent({
        section,
        eventBus: this.eventBus,
      });

      sectionComponent.mount(column);
      this.sectionComponents.set(section.id, sectionComponent);
    });

    // Drop zone for sections
    this.attachColumnDropListeners(column, columnIndex);

    return column;
  }

  /**
   * Attach drop zone listeners for sections
   */
  private attachColumnDropListeners(column: HTMLElement, columnIndex: number): void {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    });

    column.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleSectionDrop(e, columnIndex);
    });
  }

  /**
   * Handle section drop
   */
  private handleSectionDrop(e: DragEvent, columnIndex: number): void {
    if (!e.dataTransfer) return;

    const sectionId = e.dataTransfer.getData('text/plain');

    // Move section to this column
    if (this.planner.hasSection(sectionId)) {
      this.planner.moveSectionToColumn(sectionId, columnIndex);
      this.saveState('Moved section');
      this.rerender();
    }
  }

  /**
   * Save state with description
   */
  private async saveState(description: string): Promise<void> {
    await this.stateService.setState(this.planner, description);
    this.updateHeaderUndoRedo();
  }

  /**
   * Update header undo/redo button states
   */
  private updateHeaderUndoRedo(): void {
    if (this.headerComponent) {
      this.headerComponent.setUndoRedo(
        this.stateService.canUndo(),
        this.stateService.canRedo()
      );
    }
  }

  /**
   * Get the planner model
   */
  getPlanner(): PlannerModel {
    return this.planner;
  }

  /**
   * Update the planner model
   */
  updatePlanner(planner: PlannerModel): void {
    this.planner = planner;
    this.setState({ planner, orientation: planner.orientation });
  }
}
