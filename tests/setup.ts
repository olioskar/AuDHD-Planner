/**
 * Vitest setup file
 * Runs before all tests
 */

import { expect, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

global.localStorage = localStorageMock as Storage;

// Mock window methods that might not exist in jsdom
global.window.scrollTo = vi.fn();
global.window.print = vi.fn();
