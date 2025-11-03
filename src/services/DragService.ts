/**
 * Drag and drop service
 * Manages drag operations for items and sections
 */

import type { EventBus } from '@core/EventBus';
import type { DragState } from '@types/models';

/**
 * Drag operation type
 */
export type DragType = 'item' | 'section';

/**
 * Drag event data
 */
export interface DragEventData {
  type: DragType;
  draggedId: string;
  sourceContainerId: string;
  targetContainerId?: string;
  position?: number;
}

/**
 * Drag service options
 */
export interface DragServiceOptions {
  /** EventBus instance */
  eventBus: EventBus;
  /** Enable auto-scroll during drag */
  autoScroll?: boolean;
  /** Auto-scroll threshold in pixels */
  scrollThreshold?: number;
  /** Auto-scroll speed */
  scrollSpeed?: number;
}

/**
 * Drag and drop service
 *
 * Features:
 * - Separate handling for item and section dragging
 * - Placeholder management
 * - Auto-scroll during drag
 * - Event emission for drag operations
 *
 * @example
 * ```typescript
 * const dragService = new DragService({ eventBus });
 *
 * dragService.startDrag('item', 'item-123', 'section-456');
 * dragService.updateDragTarget('section-789', 2);
 * dragService.endDrag();
 * ```
 */
export class DragService {
  private eventBus: EventBus;
  private autoScroll: boolean;
  private scrollThreshold: number;
  private scrollSpeed: number;

  private currentDrag: DragState = {
    type: null,
    draggedId: null,
    sourceContainerId: null,
    isActive: false,
  };

  private targetContainerId: string | null = null;
  private targetPosition: number | null = null;
  private scrollInterval: number | null = null;
  private dragStartTimestamp = 0;

  /**
   * Create a new DragService
   *
   * @param options - Service configuration
   */
  constructor(options: DragServiceOptions) {
    this.eventBus = options.eventBus;
    this.autoScroll = options.autoScroll ?? true;
    this.scrollThreshold = options.scrollThreshold ?? 50;
    this.scrollSpeed = options.scrollSpeed ?? 5;
  }

  /**
   * Start a drag operation
   *
   * @param type - Type of drag operation
   * @param draggedId - ID of the dragged element
   * @param sourceContainerId - ID of the source container
   */
  startDrag(type: DragType, draggedId: string, sourceContainerId: string): void {
    if (this.currentDrag.isActive) {
      console.warn('Drag already in progress, canceling previous drag');
      this.cancelDrag();
    }

    this.currentDrag = {
      type,
      draggedId,
      sourceContainerId,
      isActive: true,
    };

    this.targetContainerId = sourceContainerId;
    this.targetPosition = null;
    this.dragStartTimestamp = Date.now();

    // Emit drag start event
    this.eventBus.emit('drag:start', {
      type,
      draggedId,
      sourceContainerId,
    });
  }

  /**
   * Update the drag target (where the element will be dropped)
   *
   * @param containerId - ID of the target container
   * @param position - Position within the container (optional)
   */
  updateDragTarget(containerId: string, position?: number): void {
    if (!this.currentDrag.isActive) {
      return;
    }

    const previousContainerId = this.targetContainerId;
    const previousPosition = this.targetPosition;

    this.targetContainerId = containerId;
    this.targetPosition = position ?? null;

    // Only emit if target changed
    if (
      previousContainerId !== containerId ||
      previousPosition !== position
    ) {
      this.eventBus.emit('drag:move', {
        type: this.currentDrag.type!,
        draggedId: this.currentDrag.draggedId!,
        sourceContainerId: this.currentDrag.sourceContainerId!,
        targetContainerId: containerId,
        position,
      });
    }
  }

  /**
   * End the drag operation and perform the drop
   *
   * @returns True if drop was successful
   */
  endDrag(): boolean {
    if (!this.currentDrag.isActive) {
      return false;
    }

    const { type, draggedId, sourceContainerId } = this.currentDrag;
    const duration = Date.now() - this.dragStartTimestamp;

    if (!type || !draggedId || !sourceContainerId) {
      this.cancelDrag();
      return false;
    }

    // Emit drop event
    this.eventBus.emit('drag:end', {
      type,
      draggedId,
      sourceContainerId,
      targetContainerId: this.targetContainerId ?? sourceContainerId,
      position: this.targetPosition ?? undefined,
    });

    // Emit specific drop event based on type
    if (type === 'item') {
      this.eventBus.emit('item:dropped', {
        itemId: draggedId,
        sourceSectionId: sourceContainerId,
        targetSectionId: this.targetContainerId ?? sourceContainerId,
        position: this.targetPosition ?? undefined,
      });
    } else if (type === 'section') {
      this.eventBus.emit('section:dropped', {
        sectionId: draggedId,
        sourceColumnId: sourceContainerId,
        targetColumnId: this.targetContainerId ?? sourceContainerId,
        position: this.targetPosition ?? undefined,
      });
    }

    // Reset drag state
    this.resetDragState();

    return true;
  }

  /**
   * Cancel the current drag operation
   */
  cancelDrag(): void {
    if (!this.currentDrag.isActive) {
      return;
    }

    const { type, draggedId, sourceContainerId } = this.currentDrag;

    if (type && draggedId && sourceContainerId) {
      this.eventBus.emit('drag:cancel', {
        type,
        draggedId,
        sourceContainerId,
      });
    }

    this.resetDragState();
  }

  /**
   * Get the current drag state
   *
   * @returns Current drag state
   */
  getDragState(): Readonly<DragState> {
    return { ...this.currentDrag };
  }

  /**
   * Check if a drag operation is active
   *
   * @returns True if drag is active
   */
  isDragging(): boolean {
    return this.currentDrag.isActive;
  }

  /**
   * Check if a specific element is being dragged
   *
   * @param id - Element ID to check
   * @returns True if element is being dragged
   */
  isDraggingElement(id: string): boolean {
    return this.currentDrag.isActive && this.currentDrag.draggedId === id;
  }

  /**
   * Get the current drag type
   *
   * @returns Current drag type or null
   */
  getDragType(): DragType | null {
    return this.currentDrag.type;
  }

  /**
   * Get the dragged element ID
   *
   * @returns Dragged element ID or null
   */
  getDraggedId(): string | null {
    return this.currentDrag.draggedId;
  }

  /**
   * Get the source container ID
   *
   * @returns Source container ID or null
   */
  getSourceContainerId(): string | null {
    return this.currentDrag.sourceContainerId;
  }

  /**
   * Get the target container ID
   *
   * @returns Target container ID or null
   */
  getTargetContainerId(): string | null {
    return this.targetContainerId;
  }

  /**
   * Get the target position
   *
   * @returns Target position or null
   */
  getTargetPosition(): number | null {
    return this.targetPosition;
  }

  /**
   * Enable or disable auto-scroll
   *
   * @param enabled - Whether auto-scroll should be enabled
   */
  setAutoScroll(enabled: boolean): void {
    this.autoScroll = enabled;

    if (!enabled && this.scrollInterval !== null) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }

  /**
   * Check if auto-scroll is enabled
   *
   * @returns True if auto-scroll is enabled
   */
  isAutoScrollEnabled(): boolean {
    return this.autoScroll;
  }

  /**
   * Start auto-scrolling based on mouse position
   *
   * @param mouseY - Current mouse Y position
   * @param viewportHeight - Viewport height
   */
  updateAutoScroll(mouseY: number, viewportHeight: number): void {
    if (!this.autoScroll || !this.currentDrag.isActive) {
      return;
    }

    const scrollUp = mouseY < this.scrollThreshold;
    const scrollDown = mouseY > viewportHeight - this.scrollThreshold;

    if (scrollUp || scrollDown) {
      if (this.scrollInterval === null) {
        this.scrollInterval = setInterval(() => {
          if (scrollUp) {
            window.scrollBy(0, -this.scrollSpeed);
          } else if (scrollDown) {
            window.scrollBy(0, this.scrollSpeed);
          }
        }, 16) as unknown as number; // ~60fps
      }
    } else {
      this.stopAutoScroll();
    }
  }

  /**
   * Stop auto-scrolling
   */
  stopAutoScroll(): void {
    if (this.scrollInterval !== null) {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
    }
  }

  /**
   * Reset drag state
   */
  private resetDragState(): void {
    this.currentDrag = {
      type: null,
      draggedId: null,
      sourceContainerId: null,
      isActive: false,
    };
    this.targetContainerId = null;
    this.targetPosition = null;
    this.stopAutoScroll();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cancelDrag();
    this.stopAutoScroll();
  }
}
