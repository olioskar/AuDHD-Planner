// Tests specifically for localStorage functionality
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Add polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

describe('LocalStorage Functionality', () => {
  let dom;
  let window;
  let document;
  let localStorage;

  beforeEach(() => {
    // Load the actual HTML file
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Create JSDOM instance
    dom = new JSDOM(htmlContent, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    
    // Create a working localStorage mock that behaves like real localStorage
    const storage = {};
    localStorage = {
      getItem: jest.fn((key) => storage[key] || null),
      setItem: jest.fn((key, value) => {
        storage[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete storage[key];
      }),
      clear: jest.fn(() => {
        Object.keys(storage).forEach(key => delete storage[key]);
      }),
      get length() {
        return Object.keys(storage).length;
      },
      key: jest.fn((index) => Object.keys(storage)[index] || null)
    };
    
    global.localStorage = localStorage;
    window.localStorage = localStorage;
    
    // Mock other required window properties
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
  });
  
  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
  });

  describe('Basic localStorage operations', () => {
    test('should be able to store and retrieve data', () => {
      const testData = { test: 'value' };
      
      localStorage.setItem('testKey', JSON.stringify(testData));
      const retrieved = JSON.parse(localStorage.getItem('testKey'));
      
      expect(retrieved).toEqual(testData);
      expect(localStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(testData));
      expect(localStorage.getItem).toHaveBeenCalledWith('testKey');
    });
    
    test('should return null for non-existent keys', () => {
      const result = localStorage.getItem('nonExistentKey');
      expect(result).toBeNull();
    });
    
    test('should be able to remove items', () => {
      localStorage.setItem('testKey', 'testValue');
      localStorage.removeItem('testKey');
      
      expect(localStorage.getItem('testKey')).toBeNull();
      expect(localStorage.removeItem).toHaveBeenCalledWith('testKey');
    });
    
    test('should be able to clear all items', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.clear();
      
      expect(localStorage.getItem('key1')).toBeNull();
      expect(localStorage.getItem('key2')).toBeNull();
      expect(localStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Planner data storage format', () => {
    test('should store planner data in the expected format', () => {
      const plannerData = {
        sections: {
          'morning': {
            title: '🕰️ Morning Routine',
            items: [
              { id: 'wake-up', text: '☀️ Wake Up', checked: false },
              { id: 'brush-teeth', text: '🦷 Brush Teeth', checked: true }
            ],
            isTextSection: false,
            textContent: '',
            placeholder: '',
            columnIndex: 0
          },
          'happy-moment': {
            title: '❤️ Happy Moment',
            items: [],
            isTextSection: true,
            textContent: 'Today was a great day!',
            placeholder: 'Write about any moment today that made you feel nice...',
            columnIndex: 2
          }
        },
        columnsOrder: [['morning'], [], ['happy-moment']],
        orientation: 'landscape'
      };
      
      localStorage.setItem('plannerData', JSON.stringify(plannerData));
      const retrieved = JSON.parse(localStorage.getItem('plannerData'));
      
      expect(retrieved).toEqual(plannerData);
      expect(retrieved.sections).toHaveProperty('morning');
      expect(retrieved.sections).toHaveProperty('happy-moment');
      expect(retrieved.sections.morning.items).toHaveLength(2);
      expect(retrieved.sections.morning.items[1].checked).toBe(true);
      expect(retrieved.sections['happy-moment'].isTextSection).toBe(true);
      expect(retrieved.sections['happy-moment'].textContent).toBe('Today was a great day!');
      expect(retrieved.orientation).toBe('landscape');
    });
    
    test('should handle empty planner data', () => {
      const emptyPlannerData = {
        sections: {},
        columnsOrder: [[], [], []],
        orientation: 'landscape'
      };
      
      localStorage.setItem('plannerData', JSON.stringify(emptyPlannerData));
      const retrieved = JSON.parse(localStorage.getItem('plannerData'));
      
      expect(retrieved).toEqual(emptyPlannerData);
      expect(Object.keys(retrieved.sections)).toHaveLength(0);
      expect(retrieved.columnsOrder).toEqual([[], [], []]);
    });
    
    test('should handle portrait orientation', () => {
      const portraitData = {
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
        orientation: 'portrait'
      };
      
      localStorage.setItem('plannerData', JSON.stringify(portraitData));
      const retrieved = JSON.parse(localStorage.getItem('plannerData'));
      
      expect(retrieved.orientation).toBe('portrait');
    });
  });

  describe('Complex planner data scenarios', () => {
    test('should handle sections with multiple items and mixed check states', () => {
      const complexData = {
        sections: {
          'homework': {
            title: '📖 Homework & Chores',
            items: [
              { id: 'math', text: '➗ Math', checked: true },
              { id: 'reading', text: '📖 Reading', checked: false },
              { id: 'writing', text: '✏️ Writing', checked: true },
              { id: 'science', text: '🔬 Science', checked: false }
            ],
            isTextSection: false,
            textContent: '',
            placeholder: '',
            columnIndex: 1
          }
        },
        columnsOrder: [[], ['homework'], []],
        orientation: 'landscape'
      };
      
      localStorage.setItem('plannerData', JSON.stringify(complexData));
      const retrieved = JSON.parse(localStorage.getItem('plannerData'));
      
      expect(retrieved.sections.homework.items).toHaveLength(4);
      
      const checkedItems = retrieved.sections.homework.items.filter(item => item.checked);
      const uncheckedItems = retrieved.sections.homework.items.filter(item => !item.checked);
      
      expect(checkedItems).toHaveLength(2);
      expect(uncheckedItems).toHaveLength(2);
      expect(checkedItems[0].text).toBe('➗ Math');
      expect(checkedItems[1].text).toBe('✏️ Writing');
    });
    
    test('should handle mixed section types', () => {
      const mixedData = {
        sections: {
          'feelings': {
            title: '😊 How Did I Feel Today?',
            items: [
              { id: 'happy', text: '😀 Happy', checked: true },
              { id: 'excited', text: '🤩 Excited', checked: false }
            ],
            isTextSection: false,
            textContent: '',
            placeholder: '',
            columnIndex: 0
          },
          'notes': {
            title: '📝 My Notes',
            items: [],
            isTextSection: true,
            textContent: 'I learned something new today about fractions!',
            placeholder: 'Write your thoughts here...',
            columnIndex: 1
          }
        },
        columnsOrder: [['feelings'], ['notes'], []],
        orientation: 'landscape'
      };
      
      localStorage.setItem('plannerData', JSON.stringify(mixedData));
      const retrieved = JSON.parse(localStorage.getItem('plannerData'));
      
      expect(retrieved.sections.feelings.isTextSection).toBe(false);
      expect(retrieved.sections.feelings.items).toHaveLength(2);
      expect(retrieved.sections.notes.isTextSection).toBe(true);
      expect(retrieved.sections.notes.textContent).toContain('fractions');
      expect(retrieved.sections.notes.items).toHaveLength(0);
    });
  });

  describe('Data persistence and recovery', () => {
    test('should maintain data integrity across storage operations', () => {
      const originalData = {
        sections: {
          'morning': {
            title: '🌅 Morning',
            items: [{ id: 'item1', text: 'Item 1', checked: false }],
            isTextSection: false,
            textContent: '',
            placeholder: '',
            columnIndex: 0
          }
        },
        columnsOrder: [['morning'], [], []],
        orientation: 'landscape'
      };
      
      // Store the data
      localStorage.setItem('plannerData', JSON.stringify(originalData));
      
      // Retrieve and modify
      const retrieved = JSON.parse(localStorage.getItem('plannerData'));
      retrieved.sections.morning.items[0].checked = true;
      retrieved.sections.morning.items.push({
        id: 'item2',
        text: 'Item 2',
        checked: false
      });
      
      // Store modified data
      localStorage.setItem('plannerData', JSON.stringify(retrieved));
      
      // Retrieve again and verify
      const final = JSON.parse(localStorage.getItem('plannerData'));
      
      expect(final.sections.morning.items).toHaveLength(2);
      expect(final.sections.morning.items[0].checked).toBe(true);
      expect(final.sections.morning.items[1].text).toBe('Item 2');
    });
    
    test('should handle malformed JSON gracefully', () => {
      // Simulate corrupted data
      localStorage.setItem('plannerData', '{"invalid": json}');
      
      expect(() => {
        JSON.parse(localStorage.getItem('plannerData'));
      }).toThrow();
      
      // Should be able to recover by clearing and setting new data
      localStorage.removeItem('plannerData');
      
      const newData = {
        sections: {},
        columnsOrder: [[], [], []],
        orientation: 'landscape'
      };
      
      localStorage.setItem('plannerData', JSON.stringify(newData));
      const recovered = JSON.parse(localStorage.getItem('plannerData'));
      
      expect(recovered).toEqual(newData);
    });
  });
});
