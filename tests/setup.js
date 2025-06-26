// Jest setup file for AuDHD Planner tests
require('@testing-library/jest-dom');

// Polyfills for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock DOMParser for Node.js
if (typeof global.DOMParser === 'undefined') {
  global.DOMParser = class DOMParser {
    parseFromString(string, type) {
      const jsdom = require('jsdom');
      const dom = new jsdom.JSDOM(string, { contentType: type });
      return dom.window.document;
    }
  };
}

// Mock localStorage for tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.matchMedia for print media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock getBoundingClientRect for drag and drop tests
Element.prototype.getBoundingClientRect = jest.fn(() => ({
  width: 120,
  height: 120,
  top: 0,
  left: 0,
  bottom: 120,
  right: 120,
  x: 0,
  y: 0,
}));

// Mock scrollTo for drag operations
global.scrollTo = jest.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));

// Mock confirm for reset operations
global.confirm = jest.fn(() => true);

// Setup DOM with basic HTML structure before each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
  
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Remove any classes that might persist between tests
  document.body.className = '';
});
