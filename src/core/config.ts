/**
 * Application configuration
 * Centralized configuration for all app settings
 */

import type { AppConfig } from '@types/config';

/**
 * Main application configuration
 * All settings are defined here for easy modification
 */
export const config: Readonly<AppConfig> = {
  app: {
    name: 'AuDHD Planner',
    version: '2.0.0',
  },

  storage: {
    adapter: 'localStorage',
    key: 'plannerData',
    autosave: true,
    autosaveDelay: 1000, // ms
    compressionEnabled: false, // for future use
  },

  page: {
    sizes: {
      a4: {
        portrait: { width: 210, height: 297 }, // mm
        landscape: { width: 297, height: 210 }, // mm
      },
    },
    defaultOrientation: 'landscape',
    mmToPx: 3.779527559, // 96 DPI conversion factor
  },

  features: {
    undoRedo: true,
    maxUndoSteps: 50,
    dragAndDrop: true,
    printOptimization: true,
    debugMode: false,

    // Future features (easy to toggle)
    cloudSync: false,
    collaboration: false,
    themes: false,
    analytics: false,
  },

  ui: {
    debounceDelay: 300, // ms
    dragPlaceholderClass: 'drag-placeholder',
    draggingClass: 'dragging',
    animations: true,
    animationDuration: 300, // ms
  },

  defaults: {
    section: {
      title: 'New Section',
      items: [],
      isTextSection: false,
      textContent: '',
      placeholder: 'Write something...',
    },
    item: {
      text: '',
      checked: false,
      priority: 'medium', // for future use
    },
  },
} as const;

/**
 * Environment-based configuration overrides
 * Can be used to change settings based on environment
 */
export const getConfig = (): Readonly<AppConfig> => {
  // In the future, you could override based on environment variables
  // For now, just return the base config
  return config;
};

/**
 * Helper to check if a feature is enabled
 *
 * @param featureName - Name of the feature to check
 * @returns True if the feature is enabled
 */
export const isFeatureEnabled = (
  featureName: keyof AppConfig['features']
): boolean => {
  return config.features[featureName];
};

/**
 * Helper to get page dimensions for current orientation
 *
 * @param orientation - Page orientation
 * @returns Page dimensions in mm
 */
export const getPageSize = (
  orientation: 'portrait' | 'landscape'
): { width: number; height: number } => {
  return config.page.sizes.a4[orientation];
};

/**
 * Convert mm to px based on configured DPI
 *
 * @param mm - Millimeters to convert
 * @returns Pixels
 */
export const mmToPx = (mm: number): number => {
  return mm * config.page.mmToPx;
};

/**
 * Convert px to mm based on configured DPI
 *
 * @param px - Pixels to convert
 * @returns Millimeters
 */
export const pxToMm = (px: number): number => {
  return px / config.page.mmToPx;
};
