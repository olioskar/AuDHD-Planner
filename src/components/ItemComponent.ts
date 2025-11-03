/**
 * Item component
 * Renders a single checklist item with checkbox and text
 */

import { Component } from '@core/Component';
import type { EventBus } from '@core/EventBus';
import type { Item as ItemModel } from '@models/Item';

/**
 * Item component state
 */
export interface ItemComponentState {
  item: ItemModel;
  sectionId: string;
  isEditing: boolean;
  isDragging: boolean;
}

/**
 * Item component options
 */
export interface ItemComponentOptions {
  item: ItemModel;
  sectionId: string;
  eventBus: EventBus;
}

/**
 * Item component
 *
 * Features:
 * - Checkbox for completing items
 * - Inline text editing
 * - Drag and drop support
 * - Delete button
 *
 * @example
 * ```typescript
 * const item = new ItemComponent({
 *   item: itemModel,
 *   sectionId: 'section-123',
 *   eventBus,
 * });
 * item.mount(container);
 * ```
 */
export class ItemComponent extends Component<ItemComponentState> {
  private item: ItemModel;
  private sectionId: string;
  private textInput: HTMLInputElement | null = null;

  constructor(options: ItemComponentOptions) {
    super(options.eventBus, {
      item: options.item,
      sectionId: options.sectionId,
      isEditing: false,
      isDragging: false,
    });

    this.item = options.item;
    this.sectionId = options.sectionId;
  }

  /**
   * Called when component is mounted
   */
  protected onMount(): void {
    // Listen for external item updates
    this.subscribe('item:updated', (data) => {
      if (data.item.id === this.item.id) {
        this.item = data.item;
        this.setState({ item: data.item });
      }
    });

    // Listen for drag events
    this.subscribe('drag:start', (data) => {
      if (data.type === 'item' && data.draggedId === this.item.id) {
        this.setState({ isDragging: true });
      }
    });

    this.subscribe('drag:end', (data) => {
      if (data.type === 'item' && data.draggedId === this.item.id) {
        this.setState({ isDragging: false });
      }
    });
  }

  /**
   * Render the component
   */
  protected render(): HTMLElement {
    const div = document.createElement('div');
    div.className = this.getClassName();
    div.setAttribute('data-item-id', this.item.id);
    div.setAttribute('draggable', 'true');

    // Checkbox
    const checkbox = this.createCheckbox();
    div.appendChild(checkbox);

    // Text input/display
    const textElement = this.createTextElement();
    div.appendChild(textElement);

    // Delete button
    const deleteBtn = this.createDeleteButton();
    div.appendChild(deleteBtn);

    // Attach event listeners
    this.attachDragListeners(div);

    return div;
  }

  /**
   * Get CSS class names for the item
   */
  private getClassName(): string {
    const classes = ['item'];

    if (this.state.item.checked) {
      classes.push('item--checked');
    }

    if (this.state.isDragging) {
      classes.push('item--dragging');
    }

    if (this.state.isEditing) {
      classes.push('item--editing');
    }

    return classes.join(' ');
  }

  /**
   * Create checkbox element
   */
  private createCheckbox(): HTMLInputElement {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item__checkbox';
    checkbox.checked = this.state.item.checked;

    checkbox.addEventListener('change', () => {
      this.handleCheckboxChange(checkbox.checked);
    });

    return checkbox;
  }

  /**
   * Create text element (input or span)
   */
  private createTextElement(): HTMLElement {
    if (this.state.isEditing) {
      return this.createTextInput();
    } else {
      return this.createTextDisplay();
    }
  }

  /**
   * Create text input for editing
   */
  private createTextInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'item__text item__text--input';
    input.value = this.state.item.text;
    input.placeholder = 'Enter item text...';

    input.addEventListener('blur', () => {
      this.handleTextBlur(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = this.state.item.text;
        input.blur();
      }
    });

    // Store reference for focus
    this.textInput = input;

    return input;
  }

  /**
   * Create text display (non-editing)
   */
  private createTextDisplay(): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = 'item__text';
    span.textContent = this.state.item.getDisplayText() || 'Empty item';

    span.addEventListener('dblclick', () => {
      this.handleTextDoubleClick();
    });

    return span;
  }

  /**
   * Create delete button
   */
  private createDeleteButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'item__delete';
    button.title = 'Delete item';
    button.innerHTML = '×';
    button.type = 'button';

    button.addEventListener('click', () => {
      this.handleDelete();
    });

    return button;
  }

  /**
   * Attach drag event listeners
   */
  private attachDragListeners(element: HTMLElement): void {
    element.addEventListener('dragstart', (e) => {
      this.handleDragStart(e);
    });

    element.addEventListener('dragend', () => {
      this.handleDragEnd();
    });
  }

  /**
   * Handle checkbox change
   */
  private handleCheckboxChange(checked: boolean): void {
    this.item.update({ checked });
    this.setState({ item: this.item });

    this.eventBus.emit('item:checked', {
      itemId: this.item.id,
      checked,
    });

    this.eventBus.emit('item:updated', {
      item: this.item,
      sectionId: this.sectionId,
    });
  }

  /**
   * Handle text double-click (start editing)
   */
  private handleTextDoubleClick(): void {
    this.setState({ isEditing: true }, true);

    // Focus input after render
    setTimeout(() => {
      this.textInput?.focus();
      this.textInput?.select();
    }, 0);
  }

  /**
   * Handle text blur (finish editing)
   */
  private handleTextBlur(newText: string): void {
    if (newText !== this.state.item.text) {
      this.item.update({ text: newText });
      this.setState({ item: this.item, isEditing: false });

      this.eventBus.emit('item:updated', {
        item: this.item,
        sectionId: this.sectionId,
      });
    } else {
      this.setState({ isEditing: false });
    }

    this.textInput = null;
  }

  /**
   * Handle delete button click
   */
  private handleDelete(): void {
    this.eventBus.emit('item:deleted', {
      itemId: this.item.id,
      sectionId: this.sectionId,
    });
  }

  /**
   * Handle drag start
   */
  private handleDragStart(e: DragEvent): void {
    if (!e.dataTransfer) return;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.item.id);

    this.eventBus.emit('drag:start', {
      type: 'item',
      draggedId: this.item.id,
      sourceContainerId: this.sectionId,
    });
  }

  /**
   * Handle drag end
   */
  private handleDragEnd(): void {
    this.eventBus.emit('drag:end', {
      type: 'item',
      draggedId: this.item.id,
      sourceContainerId: this.sectionId,
      targetContainerId: this.sectionId,
    });
  }

  /**
   * Get the item model
   */
  getItem(): ItemModel {
    return this.item;
  }

  /**
   * Update the item model
   */
  updateItem(item: ItemModel): void {
    this.item = item;
    this.setState({ item });
  }
}
