// Tests for drag and drop functionality
const { 
  setupTestEnvironment, 
  createMockSection, 
  createMockItem, 
  createMockDragEvent,
  simulateDragAndDrop,
  waitForEvents 
} = require('./helpers.js');

describe('Drag and Drop', () => {
  beforeEach(() => {
    setupTestEnvironment();
    
    // Load the script to initialize drag and drop
    const scriptContent = require('fs').readFileSync(
      require('path').resolve(__dirname, '../script.js'), 
      'utf8'
    );
    eval(scriptContent);
  });

  describe('Item Drag and Drop', () => {
    test('should handle dragstart event on items', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);

      const dragStartEvent = createMockDragEvent('dragstart');
      item.dispatchEvent(dragStartEvent);

      await waitForEvents();

      expect(item.classList.contains('dragging')).toBe(true);
      expect(document.body.classList.contains('dragging')).toBe(true);
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'test-item');
    });

    test('should handle dragend event on items', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);

      // Start drag
      item.classList.add('dragging');
      document.body.classList.add('dragging');

      const dragEndEvent = createMockDragEvent('dragend');
      item.dispatchEvent(dragEndEvent);

      await waitForEvents();

      expect(item.classList.contains('dragging')).toBe(false);
      expect(document.body.classList.contains('dragging')).toBe(false);
    });

    test('should create placeholder during item drag', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);

      const dragStartEvent = createMockDragEvent('dragstart');
      item.dispatchEvent(dragStartEvent);

      await waitForEvents();

      // Check that placeholder is created after timeout
      expect(document.querySelector('.drag-placeholder')).toBeTruthy();
      expect(item.style.display).toBe('none');
    });

    test('should handle drop on sortable list', async () => {
      const column = document.querySelector('.column');
      const section1 = createMockSection('section-1', 'Section 1');
      const section2 = createMockSection('section-2', 'Section 2');
      const item = createMockItem('test-item', 'Test Item');
      
      section1.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section1);
      column.appendChild(section2);

      const list2 = section2.querySelector('.sortable-list');
      
      await simulateDragAndDrop(item, list2);

      // Item should be moved to the second section
      expect(section1.querySelectorAll('.draggable-item')).toHaveLength(0);
      expect(section2.querySelectorAll('.draggable-item')).toHaveLength(1);
    });
  });

  describe('Section Drag and Drop', () => {
    test('should handle section dragstart event', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      column.appendChild(section);

      const header = section.querySelector('h2');
      const dragStartEvent = createMockDragEvent('dragstart');
      header.dispatchEvent(dragStartEvent);

      await waitForEvents();

      expect(document.body.classList.contains('dragging-section')).toBe(true);
      expect(section.classList.contains('dragging-section')).toBe(true);
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith('type', 'section');
      expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'test-section');
    });

    test('should handle section dragend event', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      column.appendChild(section);

      const header = section.querySelector('h2');
      
      // Start drag
      document.body.classList.add('dragging-section');
      section.classList.add('dragging-section');

      const dragEndEvent = createMockDragEvent('dragend');
      header.dispatchEvent(dragEndEvent);

      await waitForEvents();

      expect(document.body.classList.contains('dragging-section')).toBe(false);
      expect(section.classList.contains('dragging-section')).toBe(false);
    });

    test('should create section placeholder during drag', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      column.appendChild(section);

      const header = section.querySelector('h2');
      const dragStartEvent = createMockDragEvent('dragstart');
      header.dispatchEvent(dragStartEvent);

      await waitForEvents();

      expect(document.querySelector('.section-placeholder')).toBeTruthy();
      expect(section.style.display).toBe('none');
    });

    test('should handle section drop on column', async () => {
      const column1 = document.querySelectorAll('.column')[0];
      const column2 = document.querySelectorAll('.column')[1];
      const section = createMockSection('test-section', 'Test Section');
      
      column1.appendChild(section);

      const header = section.querySelector('h2');
      await simulateDragAndDrop(header, column2);

      // Section should be moved to the second column
      expect(column1.querySelectorAll('.planner-section')).toHaveLength(0);
      expect(column2.querySelectorAll('.planner-section')).toHaveLength(1);
    });
  });

  describe('Drag State Management', () => {
    test('should prevent item drag during section drag', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);

      // Set section dragging state
      document.body.classList.add('dragging-section');

      const dragStartEvent = createMockDragEvent('dragstart');
      item.dispatchEvent(dragStartEvent);

      expect(dragStartEvent.defaultPrevented).toBe(true);
    });

    test('should prevent section drag feedback during item drag', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      column.appendChild(section);

      // Set item dragging state
      document.body.classList.add('dragging');

      const header = section.querySelector('h2');
      const dragOverEvent = createMockDragEvent('dragover');
      header.dispatchEvent(dragOverEvent);

      // Should not add section drag-over class
      expect(section.classList.contains('drag-over-section')).toBe(false);
    });
  });

  describe('Drag Visual Feedback', () => {
    test('should add dragging class to item during drag', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);

      const dragStartEvent = createMockDragEvent('dragstart');
      item.dispatchEvent(dragStartEvent);

      expect(item.classList.contains('dragging')).toBe(true);
    });

    test('should add dragging-section class to section during drag', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      column.appendChild(section);

      const header = section.querySelector('h2');
      const dragStartEvent = createMockDragEvent('dragstart');
      header.dispatchEvent(dragStartEvent);

      expect(section.classList.contains('dragging-section')).toBe(true);
    });

    test('should remove visual classes after drag ends', async () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);

      // Simulate complete drag operation
      await simulateDragAndDrop(item, section.querySelector('.sortable-list'));

      expect(item.classList.contains('dragging')).toBe(false);
      expect(document.body.classList.contains('dragging')).toBe(false);
      expect(document.querySelector('.drag-placeholder')).toBeFalsy();
    });
  });
});
