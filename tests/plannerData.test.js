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
  let mockReload;

  beforeEach(async () => {
    // Load the actual HTML file
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Create JSDOM instance with complete DOM
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
    
    // Create a working localStorage mock using spies
    const localStorageStore = {};
    const localStorageMock = {
      getItem: jest.fn((key) => localStorageStore[key] || null),
      setItem: jest.fn((key, value) => {
        localStorageStore[key] = value;
      }),
      removeItem: jest.fn((key) => {
        delete localStorageStore[key];
      }),
      clear: jest.fn(() => {
        Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
      }),
      _store: localStorageStore // For debugging
    };
    
    // Replace localStorage completely
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    global.localStorage = localStorageMock;
    localStorage = localStorageMock;
    
    // Mock other window properties that are needed
    window.scrollTo = jest.fn();
    window.confirm = jest.fn(() => true);
    window.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
    window.scrollY = 0;
    
    // Mock window.location.reload to prevent JSDOM navigation errors
    mockReload = jest.fn();
    try {
      delete window.location.reload;
      window.location.reload = mockReload;
    } catch (e) {
      // If it's not configurable, we need to replace the whole location object
      Object.defineProperty(window, 'location', {
        value: {
          ...window.location,
          reload: mockReload
        },
        writable: true,
        configurable: true
      });
    }
    
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
    
    // Execute script in window context, but replace window.location.reload calls with our mock
    // First, set our mock on the window object
    dom.window.mockReload = mockReload;
    
    // Replace the actual function call in the script content
    const modifiedScriptContent = scriptContent.replace(
      'window.location.reload();',
      'window.mockReload();'
    );
    
    const scriptWrapper = `
      (function() {
        ${modifiedScriptContent}
      })();
    `;
    
    // Execute modified script
    dom.window.eval(scriptWrapper);
    
    // Wait for any async operations and then trigger DOMContentLoaded
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Trigger DOMContentLoaded event
    const domContentLoadedEvent = new window.Event('DOMContentLoaded', {
      bubbles: true,
      cancelable: false
    });
    window.document.dispatchEvent(domContentLoadedEvent);
    
    // Wait a bit more for the event handlers to be set up
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Get the PlannerData object from window
    PlannerData = window.PlannerData;
    
    // If PlannerData is still not available, throw a descriptive error
    if (!PlannerData) {
      throw new Error('PlannerData object not found on window. Available keys: ' + Object.keys(window).filter(k => !k.startsWith('on')).join(', '));
    }
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
    test('should return state with default sections from HTML', () => {
      const state = PlannerData.getCurrentState();
      
      // The HTML file contains default sections, so we expect them to be present
      expect(state.sections).toHaveProperty('morning');
      expect(state.sections).toHaveProperty('homework');
      expect(state.sections).toHaveProperty('happy-moment');
      expect(state.sections['morning'].title).toBe('🕰️ Morning Routine');
      expect(state.sections['homework'].title).toBe('📖 Homework & Chores');
      expect(state.sections['happy-moment'].title).toBe('❤️ Happy Moment');
      expect(state.sections['happy-moment'].isTextSection).toBe(true);
      expect(state.orientation).toBe('landscape');
      expect(state.columnsOrder).toHaveLength(3);
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
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
      localStorage.setItem.mockClear();
      localStorage.getItem.mockClear();
      localStorage.removeItem.mockClear();
    });
    
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
      // Clear localStorage completely and ensure getItem returns null
      localStorage.clear();
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
      // Clear mock call counts first
      localStorage.removeItem.mockClear();
      mockReload.mockClear();
      
      // Ensure the mock is still properly applied to the window object right before the test
      window.location.reload = mockReload;
      
      PlannerData.reset();

      expect(localStorage.removeItem).toHaveBeenCalledWith('plannerData');
      expect(mockReload).toHaveBeenCalled();
    });
  });
});
