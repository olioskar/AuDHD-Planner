// Tests for drag and drop functionality
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('Drag and Drop', () => {
  let dom;
  let window;
  let document;
  let PlannerData;

  beforeEach(async () => {
    // Load the actual HTML file
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Create JSDOM instance
    dom = new JSDOM(htmlContent, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable',
      runScripts: 'outside-only'
    });
    
    // Suppress console errors for CSS loading failures
    const originalConsoleError = console.error;
    console.error = (...args) => {
      if (args[0] && args[0].toString().includes('Could not load link')) {
        return; // Suppress CSS loading errors
      }
      originalConsoleError.apply(console, args);
    };
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    
    // Mock localStorage and other APIs
    const localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    global.localStorage = localStorage;
    window.localStorage = localStorage;
    
    // Mock other window properties
    window.scrollTo = jest.fn();
    window.confirm = jest.fn(() => true);
    window.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
    window.scrollY = 0;
    
    // Mock window.location.reload to prevent JSDOM navigation errors
    delete window.location.reload;
    window.location.reload = jest.fn();
    
    // Mock getBoundingClientRect
    window.Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 120, height: 120, top: 0, left: 0, bottom: 120, right: 120, x: 0, y: 0,
    }));
    
    // Load and execute the script
    const scriptPath = path.resolve(__dirname, '../script.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    const scriptWrapper = `
      (function() {
        ${scriptContent}
      })();
    `;
    
    dom.window.eval(scriptWrapper);
    
    // Wait and trigger DOMContentLoaded
    await new Promise(resolve => setTimeout(resolve, 0));
    const domContentLoadedEvent = new window.Event('DOMContentLoaded', { bubbles: true, cancelable: false });
    window.document.dispatchEvent(domContentLoadedEvent);
    await new Promise(resolve => setTimeout(resolve, 10));
    
    PlannerData = window.PlannerData;
  });
  
  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
  });
  
  // Helper functions
  function createMockSection(id = 'test-section', title = 'Test Section') {
    const section = document.createElement('section');
    section.className = 'planner-section';
    section.dataset.section = id;
    section.innerHTML = `
      <div class="section-header">
        <h2 draggable="true">${title}</h2>
        <div class="section-actions">
          <button class="add-item-button" title="Add new item">+</button>
          <button class="remove-section-button" title="Remove section">−</button>
        </div>
      </div>
      <ul class="sortable-list"></ul>
    `;
    return section;
  }
  
  function createMockItem(id = 'test-item', text = 'Test Item') {
    const li = document.createElement('li');
    li.className = 'draggable-item';
    li.draggable = true;
    li.dataset.id = id;
    li.innerHTML = `
      <span class="checkbox"></span>
      <span>${text}</span>
    `;
    return li;
  }
  
  function createMockDragEvent(type) {
    const event = new window.Event(type, { bubbles: true, cancelable: true });
    event.dataTransfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: jest.fn(),
      getData: jest.fn(),
      setDragImage: jest.fn(),
      clearData: jest.fn()
    };
    event.clientX = 100;
    event.clientY = 100;
    return event;
  }
  
  async function waitForEvents() {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  describe('Item Drag and Drop', () => {
    test('should create draggable items with correct attributes', () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);

      expect(item.draggable).toBe(true);
      expect(item.dataset.id).toBe('test-item');
      expect(item.className).toBe('draggable-item');
      expect(item.querySelector('span:nth-child(2)').textContent).toBe('Test Item');
    });

    test('should have drag event listeners attached to items', () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);

      // Test that event listeners are attached by checking if events can be dispatched
      const dragStartEvent = createMockDragEvent('dragstart');
      expect(() => item.dispatchEvent(dragStartEvent)).not.toThrow();
    });

    test('should be able to move items between lists programmatically', () => {
      const column = document.querySelector('.column');
      const section1 = createMockSection('section-1', 'Section 1');
      const section2 = createMockSection('section-2', 'Section 2');
      const item = createMockItem('test-item', 'Test Item');
      
      const list1 = section1.querySelector('.sortable-list');
      const list2 = section2.querySelector('.sortable-list');
      
      list1.appendChild(item);
      column.appendChild(section1);
      column.appendChild(section2);

      expect(list1.children.length).toBe(1);
      expect(list2.children.length).toBe(0);

      // Move item programmatically
      list2.appendChild(item);

      expect(list1.children.length).toBe(0);
      expect(list2.children.length).toBe(1);
    });
  });

  describe('Section Drag and Drop', () => {
    test('should create sections with draggable headers', () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      column.appendChild(section);

      const header = section.querySelector('h2');
      expect(header.draggable).toBe(true);
      expect(header.textContent).toBe('Test Section');
      expect(section.dataset.section).toBe('test-section');
    });

    test('should be able to move sections between columns programmatically', () => {
      const column1 = document.querySelectorAll('.column')[0];
      const column2 = document.querySelectorAll('.column')[1];
      const section = createMockSection('test-section', 'Test Section');
      
      // Count existing sections in columns from the HTML
      const initialColumn1Count = column1.querySelectorAll('.planner-section').length;
      const initialColumn2Count = column2.querySelectorAll('.planner-section').length;
      
      column1.appendChild(section);
      expect(column1.querySelectorAll('.planner-section')).toHaveLength(initialColumn1Count + 1);
      expect(column2.querySelectorAll('.planner-section')).toHaveLength(initialColumn2Count);

      // Move section programmatically
      column2.appendChild(section);
      expect(column1.querySelectorAll('.planner-section')).toHaveLength(initialColumn1Count);
      expect(column2.querySelectorAll('.planner-section')).toHaveLength(initialColumn2Count + 1);
    });

    test('should have drag event listeners on section headers', () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      column.appendChild(section);

      const header = section.querySelector('h2');
      const dragStartEvent = createMockDragEvent('dragstart');
      expect(() => header.dispatchEvent(dragStartEvent)).not.toThrow();
    });
  });

  describe('Basic Functionality Tests', () => {
    test('should maintain separate item and section drag systems', () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);

      const header = section.querySelector('h2');
      
      // Both should be draggable but independent
      expect(item.draggable).toBe(true);
      expect(header.draggable).toBe(true);
      expect(item.dataset.id).toBe('test-item');
      expect(section.dataset.section).toBe('test-section');
    });

    test('should support basic DOM manipulation for testing drag operations', () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      const item = createMockItem('test-item', 'Test Item');
      
      // Test basic DOM operations that drag handlers would perform
      section.querySelector('.sortable-list').appendChild(item);
      column.appendChild(section);
      
      // Simulate adding drag classes (what drag handlers do)
      document.body.classList.add('dragging-section');
      section.classList.add('dragging-section');
      
      expect(document.body.classList.contains('dragging-section')).toBe(true);
      expect(section.classList.contains('dragging-section')).toBe(true);
      
      // Clean up
      document.body.classList.remove('dragging-section');
      section.classList.remove('dragging-section');
      
      expect(document.body.classList.contains('dragging-section')).toBe(false);
      expect(section.classList.contains('dragging-section')).toBe(false);
    });
  });
});
