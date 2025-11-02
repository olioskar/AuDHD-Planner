/**
 * Configuration type definitions
 */

/**
 * Storage adapter type
 */
export type StorageAdapterType = 'localStorage' | 'indexedDB' | 'memory';

/**
 * Page orientation
 */
export type Orientation = 'portrait' | 'landscape';

/**
 * Page size configuration
 */
export interface PageSize {
  width: number;
  height: number;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  adapter: StorageAdapterType;
  key: string;
  autosave: boolean;
  autosaveDelay: number;
  compressionEnabled: boolean;
}

/**
 * Page configuration
 */
export interface PageConfig {
  sizes: {
    a4: {
      portrait: PageSize;
      landscape: PageSize;
    };
  };
  defaultOrientation: Orientation;
  mmToPx: number;
}

/**
 * Features configuration
 */
export interface FeaturesConfig {
  undoRedo: boolean;
  maxUndoSteps: number;
  dragAndDrop: boolean;
  printOptimization: boolean;
  debugMode: boolean;
  cloudSync: boolean;
  collaboration: boolean;
  themes: boolean;
  analytics: boolean;
}

/**
 * UI configuration
 */
export interface UIConfig {
  debounceDelay: number;
  dragPlaceholderClass: string;
  draggingClass: string;
  animations: boolean;
  animationDuration: number;
}

/**
 * Default values configuration
 */
export interface DefaultsConfig {
  section: {
    title: string;
    items: [];
    isTextSection: boolean;
    textContent: string;
    placeholder: string;
  };
  item: {
    text: string;
    checked: boolean;
    priority: string;
  };
}

/**
 * Application configuration
 */
export interface AppConfig {
  app: {
    name: string;
    version: string;
  };
  storage: StorageConfig;
  page: PageConfig;
  features: FeaturesConfig;
  ui: UIConfig;
  defaults: DefaultsConfig;
}
