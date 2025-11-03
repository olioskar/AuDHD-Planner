/**
 * Section component
 * Renders a section with title and items (or text area)
 */

import { Component } from '@core/Component';
import type { EventBus } from '@core/EventBus';
import type { Section as SectionModel } from '@models/Section';
import { ItemComponent } from './ItemComponent';

/**
 * Section component state
 */
export interface SectionComponentState {
  section: SectionModel;
  isEditingTitle: boolean;
  isDragging: boolean;
}

/**
 * Section component options
 */
export interface SectionComponentOptions {
  section: SectionModel;
  eventBus: EventBus;
}

/**
 * Section component
 *
 * Features:
 * - Editable title
 * - List of items or text area
 * - Add/remove items
 * - Drag and drop support
 * - Delete section
 *
 * @example
 * ```typescript
 * const section = new SectionComponent({
 *   section: sectionModel,
 *   eventBus,
 * });
 * section.mount(container);
 * ```
 */
export class SectionComponent extends Component<SectionComponentState> {
  private section: SectionModel;
  private itemComponents: Map<string, ItemComponent> = new Map();
  private titleInput: HTMLInputElement | null = null;
  

  constructor(options: SectionComponentOptions) {
    super(options.eventBus, {
      section: options.section,
      isEditingTitle: false,
      isDragging: false,
    });

    this.section = options.section;
  }

  /**
   * Called when component is mounted
   */
  protected onMount(): void {
    // Listen for section updates
    this.subscribe('section:updated', (data) => {
      if (data.section.id === this.section.id) {
        this.section = data.section;
        this.setState({ section: data.section });
      }
    });

    // Listen for item events
    this.subscribe('item:created', (data) => {
      if (data.sectionId === this.section.id) {
        this.section.addItem(data.item);
        this.setState({ section: this.section });
      }
    });

    this.subscribe('item:deleted', (data) => {
      if (data.sectionId === this.section.id) {
        this.section.removeItem(data.itemId);
        this.setState({ section: this.section });
      }
    });

    // Listen for drag events
    this.subscribe('drag:start', (data) => {
      if (data.type === 'section' && data.draggedId === this.section.id) {
        this.setState({ isDragging: true });
      }
    });

    this.subscribe('drag:end', (data) => {
      if (data.type === 'section' && data.draggedId === this.section.id) {
        this.setState({ isDragging: false });
      }
    });

    // Listen for item drops
    this.subscribe('item:dropped', (data) => {
      if (data.targetSectionId === this.section.id) {
        this.handleItemDropped(data);
      }
    });
  }

  /**
   * Called when component is unmounted
   */
  protected onUnmount(): void {
    // Clean up item components
    this.itemComponents.forEach((comp) => comp.unmount());
    this.itemComponents.clear();
  }

  /**
   * Render the component
   */
  protected render(): HTMLElement {
    const section = document.createElement('div');
    section.className = this.getClassName();
    section.setAttribute('data-section', this.section.id);

    // Header (title + actions)
    const header = this.createHeader();
    section.appendChild(header);

    // Content (items list or text area)
    const content = this.createContent();
    section.appendChild(content);

    // Attach drag listeners for section dragging
    this.attachDragListeners(section, header);

    return section;
  }

  /**
   * Get CSS class names for the section
   */
  private getClassName(): string {
    const classes = ['section'];

    if (this.state.section.isTextSection) {
      classes.push('section--text');
    } else {
      classes.push('section--list');
    }

    if (this.state.isDragging) {
      classes.push('section--dragging');
    }

    return classes.join(' ');
  }

  /**
   * Create section header
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'section__header';
    header.setAttribute('data-section-header', 'true');

    // Title
    const title = this.createTitle();
    header.appendChild(title);

    // Actions
    const actions = this.createActions();
    header.appendChild(actions);

    return header;
  }

  /**
   * Create title element
   */
  private createTitle(): HTMLElement {
    if (this.state.isEditingTitle) {
      return this.createTitleInput();
    } else {
      return this.createTitleDisplay();
    }
  }

  /**
   * Create title input for editing
   */
  private createTitleInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'section__title section__title--input';
    input.value = this.state.section.title;

    input.addEventListener('blur', () => {
      this.handleTitleBlur(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = this.state.section.title;
        input.blur();
      }
    });

    this.titleInput = input;

    return input;
  }

  /**
   * Create title display (non-editing)
   */
  private createTitleDisplay(): HTMLHeadingElement {
    const h3 = document.createElement('h3');
    h3.className = 'section__title';
    h3.textContent = this.state.section.title;

    h3.addEventListener('dblclick', () => {
      this.handleTitleDoubleClick();
    });

    return h3;
  }

  /**
   * Create action buttons
   */
  private createActions(): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'section__actions';

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'section__delete';
    deleteBtn.title = 'Delete section';
    deleteBtn.innerHTML = '×';
    deleteBtn.type = 'button';

    deleteBtn.addEventListener('click', () => {
      this.handleDelete();
    });

    actions.appendChild(deleteBtn);

    return actions;
  }

  /**
   * Create section content
   */
  private createContent(): HTMLElement {
    if (this.state.section.isTextSection) {
      return this.createTextArea();
    } else {
      return this.createItemsList();
    }
  }

  /**
   * Create text area for text sections
   */
  private createTextArea(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'section__content section__content--text';

    const textarea = document.createElement('textarea');
    textarea.className = 'section__textarea';
    textarea.value = this.state.section.textContent;
    textarea.placeholder = this.state.section.placeholder || 'Enter text...';

    textarea.addEventListener('input', () => {
      this.handleTextAreaChange(textarea.value);
    });

    
    container.appendChild(textarea);

    return container;
  }

  /**
   * Create items list for list sections
   */
  private createItemsList(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'section__content section__content--list';

    // Items container
    const itemsList = document.createElement('div');
    itemsList.className = 'section__items';
    itemsList.setAttribute('data-items-container', this.section.id);

    // Render items
    this.section.items.forEach((item) => {
      const itemComponent = new ItemComponent({
        item,
        sectionId: this.section.id,
        eventBus: this.eventBus,
      });

      const itemElement = itemComponent.mount(itemsList);
      this.itemComponents.set(item.id, itemComponent);

      // Attach drop zone listeners
      this.attachItemDropListeners(itemElement);
    });

    container.appendChild(itemsList);

    // Add item button
    const addBtn = document.createElement('button');
    addBtn.className = 'section__add-item';
    addBtn.textContent = '+ Add item';
    addBtn.type = 'button';

    addBtn.addEventListener('click', () => {
      this.handleAddItem();
    });

    container.appendChild(addBtn);

    return container;
  }

  /**
   * Attach drag listeners for section dragging
   */
  private attachDragListeners(_section: HTMLElement, header: HTMLElement): void {
    header.addEventListener('dragstart', (e) => {
      this.handleSectionDragStart(e);
    });

    header.addEventListener('dragend', () => {
      this.handleSectionDragEnd();
    });

    header.setAttribute('draggable', 'true');
  }

  /**
   * Attach drop zone listeners for items
   */
  private attachItemDropListeners(element: HTMLElement): void {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      this.handleItemDrop(e);
    });
  }

  /**
   * Handle title double-click (start editing)
   */
  private handleTitleDoubleClick(): void {
    this.setState({ isEditingTitle: true }, true);

    setTimeout(() => {
      this.titleInput?.focus();
      this.titleInput?.select();
    }, 0);
  }

  /**
   * Handle title blur (finish editing)
   */
  private handleTitleBlur(newTitle: string): void {
    if (newTitle && newTitle !== this.state.section.title) {
      this.section.update({ title: newTitle });
      this.setState({ section: this.section, isEditingTitle: false });

      this.eventBus.emit('section:updated', {
        section: this.section,
      });
    } else {
      this.setState({ isEditingTitle: false });
    }

    this.titleInput = null;
  }

  /**
   * Handle text area change
   */
  private handleTextAreaChange(newText: string): void {
    this.section.textContent = newText;

    this.eventBus.emit('section:updated', {
      section: this.section,
    });
  }

  /**
   * Handle add item button click
   */
  private handleAddItem(): void {
    const item = this.section.addItem({ text: '' });

    this.eventBus.emit('item:created', {
      item,
      sectionId: this.section.id,
    });

    this.setState({ section: this.section });
  }

  /**
   * Handle delete button click
   */
  private handleDelete(): void {
    this.eventBus.emit('section:deleted', {
      sectionId: this.section.id,
    });
  }

  /**
   * Handle section drag start
   */
  private handleSectionDragStart(e: DragEvent): void {
    if (!e.dataTransfer) return;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.section.id);

    this.eventBus.emit('drag:start', {
      type: 'section',
      draggedId: this.section.id,
      sourceContainerId: `column-${this.section.columnIndex}`,
    });
  }

  /**
   * Handle section drag end
   */
  private handleSectionDragEnd(): void {
    this.eventBus.emit('drag:end', {
      type: 'section',
      draggedId: this.section.id,
      sourceContainerId: `column-${this.section.columnIndex}`,
      targetContainerId: `column-${this.section.columnIndex}`,
    });
  }

  /**
   * Handle item drop
   */
  private handleItemDrop(e: DragEvent): void {
    if (!e.dataTransfer) return;

    const itemId = e.dataTransfer.getData('text/plain');

    // Emit drop event (StateService will handle the actual move)
    this.eventBus.emit('item:dropped', {
      itemId,
      sourceSectionId: '', // Will be filled by DragService
      targetSectionId: this.section.id,
      position: undefined,
    });
  }

  /**
   * Handle item dropped event
   */
  private handleItemDropped(_data: {
    itemId: string;
    sourceSectionId: string;
    targetSectionId: string;
    position?: number;
  }): void {
    // Re-render to show the new item
    this.rerender();
  }

  /**
   * Get the section model
   */
  getSection(): SectionModel {
    return this.section;
  }

  /**
   * Update the section model
   */
  updateSection(section: SectionModel): void {
    this.section = section;
    this.setState({ section });
  }
}
