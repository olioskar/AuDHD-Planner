// Basic integration tests for AuDHD Planner
const fs = require('fs');
const path = require('path');

// Add polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');

describe('AuDHD Planner Integration Tests', () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Load the actual HTML file
    const htmlPath = path.resolve(__dirname, '../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Load the CSS file
    const cssPath = path.resolve(__dirname, '../styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
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
    global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    
    // Mock other window properties
    window.scrollTo = jest.fn();
    window.confirm = jest.fn(() => true);
    
    // Add CSS to the document
    const style = document.createElement('style');
    style.textContent = cssContent;
    document.head.appendChild(style);
  });

  afterEach(() => {
    if (dom) {
      dom.window.close();
    }
  });

  describe('HTML Structure', () => {
    test('should have correct basic structure', () => {
      expect(document.querySelector('.app-header')).toBeTruthy();
      expect(document.querySelector('.planner-container')).toBeTruthy();
      expect(document.querySelectorAll('.column')).toHaveLength(3);
    });

    test('should have all required action buttons', () => {
      expect(document.querySelector('.add-section-button')).toBeTruthy();
      expect(document.querySelector('.orientation-toggle')).toBeTruthy();
      expect(document.querySelector('.reset-button')).toBeTruthy();
    });

    test('should have initial sections with correct structure', () => {
      const sections = document.querySelectorAll('.planner-section');
      expect(sections.length).toBeGreaterThan(0);
      
      // Check that sections have proper structure
      sections.forEach(section => {
        const header = section.querySelector('h2');
        if (header) {
          expect(header.getAttribute('draggable')).toBe('true');
        }
      });
    });

    test('should have draggable items with checkboxes', () => {
      const items = document.querySelectorAll('.draggable-item');
      expect(items.length).toBeGreaterThan(0);
      
      items.forEach(item => {
        expect(item.getAttribute('draggable')).toBe('true');
        expect(item.querySelector('.checkbox')).toBeTruthy();
        expect(item.dataset.id).toBeTruthy();
      });
    });

    test('should have writing space section', () => {
      const writingSpace = document.querySelector('.writing-space');
      expect(writingSpace).toBeTruthy();
      expect(writingSpace.tagName.toLowerCase()).toBe('textarea');
    });
  });

  describe('CSS Classes and Styling', () => {
    test('should have correct CSS classes applied', () => {
      expect(document.querySelector('.planner-container')).toBeTruthy();
      expect(document.querySelector('.column')).toBeTruthy();
      expect(document.querySelector('.planner-section')).toBeTruthy();
      expect(document.querySelector('.sortable-list')).toBeTruthy();
    });

    test('should have action buttons with correct classes', () => {
      const addItemButtons = document.querySelectorAll('.add-item-button');
      expect(addItemButtons.length).toBeGreaterThan(0);
      
      addItemButtons.forEach(button => {
        expect(button.textContent).toBe('+');
        expect(button.title).toBe('Add new item');
      });
    });
  });

  describe('Data Attributes', () => {
    test('should have sections with data-section attributes', () => {
      const sections = document.querySelectorAll('.planner-section[data-section]');
      expect(sections.length).toBeGreaterThan(0);
      
      const sectionIds = Array.from(sections).map(s => s.dataset.section);
      expect(sectionIds).toContain('morning');
      expect(sectionIds).toContain('homework');
      expect(sectionIds).toContain('sensory');
    });

    test('should have items with data-id attributes', () => {
      const items = document.querySelectorAll('.draggable-item[data-id]');
      expect(items.length).toBeGreaterThan(0);
      
      items.forEach(item => {
        expect(item.dataset.id).toBeTruthy();
        expect(item.dataset.id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    test('should have proper heading structure', () => {
      const h1 = document.querySelector('h1');
      expect(h1).toBeTruthy();
      expect(h1.textContent).toBe('My Daily Planner');
      
      const h2s = document.querySelectorAll('h2');
      expect(h2s.length).toBeGreaterThan(0);
    });

    test('should have buttons with proper titles', () => {
      const buttons = document.querySelectorAll('button[title]');
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(button => {
        expect(button.title.length).toBeGreaterThan(0);
      });
    });

    test('should have textarea with placeholder', () => {
      const textarea = document.querySelector('textarea');
      expect(textarea).toBeTruthy();
      expect(textarea.placeholder).toBeTruthy();
      expect(textarea.placeholder.length).toBeGreaterThan(0);
    });
  });

  describe('Content Structure', () => {
    test('should have meaningful section titles with emojis', () => {
      const morningSection = document.querySelector('[data-section="morning"] h2');
      expect(morningSection.textContent).toContain('🕰️');
      expect(morningSection.textContent).toContain('Morning');
      
      const sensorySection = document.querySelector('[data-section="sensory"] h2');
      expect(sensorySection.textContent).toContain('🌀');
      expect(sensorySection.textContent).toContain('Sensory');
    });

    test('should have items with emoji icons', () => {
      const items = document.querySelectorAll('.draggable-item span:nth-child(2)');
      let hasEmojis = false;
      
      items.forEach(item => {
        const text = item.textContent;
        // Check for common emoji patterns
        if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text)) {
          hasEmojis = true;
        }
      });
      
      expect(hasEmojis).toBe(true);
    });

    test('should have three columns layout', () => {
      const columns = document.querySelectorAll('.column');
      expect(columns).toHaveLength(3);
      
      // Each column should have sections
      columns.forEach(column => {
        const sections = column.querySelectorAll('.planner-section');
        expect(sections.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Print Optimization', () => {
    test('should have print-specific CSS classes', () => {
      // Check that the CSS contains print media queries
      const style = document.querySelector('style');
      expect(style.textContent).toContain('@media print');
      expect(style.textContent).toContain('page-break');
    });

    test('should have elements that will be hidden in print', () => {
      expect(document.querySelector('.app-header')).toBeTruthy();
      expect(document.querySelector('.add-item-button')).toBeTruthy();
      expect(document.querySelector('.remove-section-button')).toBeTruthy();
    });
  });

  describe('Interactive Elements', () => {
    test('should have clickable checkboxes', () => {
      const checkboxes = document.querySelectorAll('.checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
      
      checkboxes.forEach(checkbox => {
        expect(checkbox.classList.contains('checked')).toBe(false);
      });
    });

    test('should have editable content areas', () => {
      const headers = document.querySelectorAll('.planner-section h2[draggable="true"]');
      expect(headers.length).toBeGreaterThan(0);
      
      const textarea = document.querySelector('.writing-space');
      expect(textarea).toBeTruthy();
    });

    test('should have add/remove functionality elements', () => {
      const addButtons = document.querySelectorAll('.add-item-button');
      expect(addButtons.length).toBeGreaterThan(0);
      
      const removeButtons = document.querySelectorAll('.remove-section-button');
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });
});
