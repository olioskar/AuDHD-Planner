// Tests for PlannerData state management
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Add polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

describe('PlannerData', () => {
  let dom;
  let window;
  let document;
  let PlannerData;
  let localStorage;

  beforeEach(() => {
    // Load the actual HTML file
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Create JSDOM instance with complete DOM
    dom = new JSDOM(htmlContent, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    
    // Create a proper localStorage mock
    localStorage = {
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
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    
    // Mock getBoundingClientRect
    window.Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 120,
      height: 120,
      top: 0,
      left: 0,
      bottom: 120,
      right: 120,
      x: 0,
      y: 0,
    }));
    
    // Load and execute the script to get PlannerData
    const scriptPath = path.resolve(__dirname, '../script.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    
    // Execute the script in the window context
    const script = new window.Function(scriptContent);
    script.call(window);
    
    // Trigger DOMContentLoaded to initialize the script
    const event = new window.Event('DOMContentLoaded');
    window.document.dispatchEvent(event);
    
    // Get the PlannerData object from window
    console.log('window.PlannerData:', window.PlannerData);
    console.log('window keys:', Object.keys(window));
    // Manual assignment for testing purposes
    PlannerData = window.PlannerData;
    if (!PlannerData) {
      const scriptData = Object.values(window).find(v => typeof v === 'object' && v && v.save && typeof v.save === 'function');
      // Assuming scriptData is PlannerData if it has save method
      PlannerData = scriptData || null;
    }
    console.log('Attempted PlannerData:', PlannerData);
  });
  
  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
  });
  
  // Helper functions for creating mock elements
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

  describe('getCurrentState()', () => {
    test('should return empty state when no sections exist', () => {
      const state = PlannerData.getCurrentState();
      
      expect(state).toEqual({
        sections: {},
        columnsOrder: [[], [], []],
        orientation: 'landscape'
      });
    });

    test('should capture section data correctly', () => {
      // Add a test section to the first column
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', '🧪 Test Section');
      
      // Add some items
      const list = section.querySelector('.sortable-list');
      const item1 = createMockItem('item-1', '✅ Test Item 1');
      const item2 = createMockItem('item-2', '📝 Test Item 2');
      
      list.appendChild(item1);
      list.appendChild(item2);
      column.appendChild(section);

      const state = PlannerData.getCurrentState();
      
      expect(state.sections['test-section']).toEqual({
        title: '🧪 Test Section',
        items: [
          { id: 'item-1', text: '✅ Test Item 1', checked: false },
          { id: 'item-2', text: '📝 Test Item 2', checked: false }
        ],
        isTextSection: false,
        textContent: '',
        placeholder: '',
        columnIndex: 0
      });
    });

    test('should capture text section data correctly', () => {
      const column = document.querySelector('.column');
      const section = document.createElement('section');
      section.className = 'planner-section';
      section.dataset.section = 'text-section';
      section.innerHTML = `
        <h2 draggable="true">❤️ Happy Moment</h2>
        <textarea class="writing-space" placeholder="Write about your day...">Today was great!</textarea>
      `;
      
      column.appendChild(section);

      const state = PlannerData.getCurrentState();
      
      expect(state.sections['text-section']).toEqual({
        title: '❤️ Happy Moment',
        items: [],
        isTextSection: true,
        textContent: 'Today was great!',
        placeholder: 'Write about your day...',
        columnIndex: 0
      });
    });

    test('should detect portrait orientation', () => {
      document.body.classList.add('portrait-mode');
      
      const state = PlannerData.getCurrentState();
      
      expect(state.orientation).toBe('portrait');
    });
  });

  describe('save() and load()', () => {
    test('should save state to localStorage', () => {
      const column = document.querySelector('.column');
      const section = createMockSection('test-section', 'Test Section');
      column.appendChild(section);

      PlannerData.save();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'plannerData',
        expect.stringContaining('test-section')
      );
    });

    test('should load state from localStorage', () => {
      const mockState = {
        sections: {
          'test-section': {
            title: 'Test Section',
            items: [],
            isTextSection: false,
            textContent: '',
            placeholder: '',
            columnIndex: 0
          }
        },
        columnsOrder: [['test-section'], [], []],
        orientation: 'landscape'
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(mockState));

      const loadedState = PlannerData.load();

      expect(loadedState).toEqual(mockState);
    });

    test('should return null when no saved state exists', () => {
      localStorage.getItem.mockReturnValue(null);

      const loadedState = PlannerData.load();

      expect(loadedState).toBeNull();
    });
  });

  describe('createSection()', () => {
    test('should create a list-type section correctly', () => {
      const sectionData = {
        title: '🧪 Test Section',
        items: [
          { id: 'item-1', text: 'Test Item', checked: false }
        ],
        isTextSection: false,
        textContent: '',
        placeholder: '',
        columnIndex: 0
      };

      const section = PlannerData.createSection('test-section', sectionData);

      expect(section.className).toBe('planner-section');
      expect(section.dataset.section).toBe('test-section');
      expect(section.querySelector('h2').textContent).toBe('🧪 Test Section');
      expect(section.querySelector('.sortable-list')).toBeTruthy();
      expect(section.querySelectorAll('.draggable-item')).toHaveLength(1);
    });

    test('should create a text-type section correctly', () => {
      const sectionData = {
        title: '❤️ Happy Moment',
        items: [],
        isTextSection: true,
        textContent: 'Great day!',
        placeholder: 'Write about your day...',
        columnIndex: 0
      };

      const section = PlannerData.createSection('text-section', sectionData);

      expect(section.className).toBe('planner-section');
      expect(section.dataset.section).toBe('text-section');
      expect(section.querySelector('h2').textContent).toBe('❤️ Happy Moment');
      expect(section.querySelector('textarea')).toBeTruthy();
      expect(section.querySelector('textarea').value).toBe('Great day!');
      expect(section.querySelector('textarea').placeholder).toBe('Write about your day...');
    });
  });

  describe('createItem()', () => {
    test('should create a draggable item correctly', () => {
      const itemData = {
        id: 'test-item',
        text: '✅ Test Item',
        checked: false
      };

      const item = PlannerData.createItem(itemData);

      expect(item.className).toBe('draggable-item');
      expect(item.dataset.id).toBe('test-item');
      expect(item.draggable).toBe(true);
      expect(item.querySelector('span:nth-child(2)').textContent).toBe('✅ Test Item');
      expect(item.querySelector('.checkbox').classList.contains('checked')).toBe(false);
    });

    test('should create a checked item correctly', () => {
      const itemData = {
        id: 'test-item',
        text: '✅ Test Item',
        checked: true
      };

      const item = PlannerData.createItem(itemData);

      expect(item.querySelector('.checkbox').classList.contains('checked')).toBe(true);
    });
  });

  describe('applyState()', () => {
    test('should apply state correctly', () => {
      const state = {
        sections: {
          'test-section': {
            title: '🧪 Test Section',
            items: [
              { id: 'item-1', text: 'Test Item', checked: false }
            ],
            isTextSection: false,
            textContent: '',
            placeholder: '',
            columnIndex: 0
          }
        },
        columnsOrder: [['test-section'], [], []],
        orientation: 'landscape'
      };

      const result = PlannerData.applyState(state);

      expect(result).toBe(true);
      expect(document.querySelector('[data-section="test-section"]')).toBeTruthy();
      expect(document.querySelector('[data-section="test-section"] h2').textContent).toBe('🧪 Test Section');
    });

    test('should apply portrait orientation correctly', () => {
      const state = {
        sections: {},
        columnsOrder: [[], [], []],
        orientation: 'portrait'
      };

      PlannerData.applyState(state);

      expect(document.body.classList.contains('portrait-mode')).toBe(true);
      expect(document.querySelector('.planner-container').classList.contains('portrait')).toBe(true);
    });

    test('should return false for null state', () => {
      const result = PlannerData.applyState(null);

      expect(result).toBe(false);
    });
  });

  describe('reset()', () => {
    test('should clear localStorage and reload page', () => {
      // Mock window.location.reload by modifying the existing location object
      const originalReload = window.location.reload;
      const mockReload = jest.fn();
      window.location.reload = mockReload;

      PlannerData.reset();

      expect(localStorage.removeItem).toHaveBeenCalledWith('plannerData');
      expect(mockReload).toHaveBeenCalled();
      
      // Restore original reload
      window.location.reload = originalReload;
    });
  });
});
