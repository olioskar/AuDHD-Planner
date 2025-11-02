# AuDHD Planner - TypeScript Architecture Refactoring Plan

**Version:** 2.0.0
**Date:** 2025-11-02
**Branch:** `claude/typescript-architecture-refactor-011CUhsy2eTsnG3zJmcAvqbQ`
**Status:** Planning Phase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Why TypeScript](#why-typescript)
4. [Proposed Architecture](#proposed-architecture)
5. [Implementation Phases](#implementation-phases)
6. [Technical Specifications](#technical-specifications)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Success Metrics](#success-metrics)
10. [Risk Assessment](#risk-assessment)
11. [Timeline](#timeline)

---

## Executive Summary

### Current State
- **Architecture:** Monolithic vanilla JavaScript (1,271 lines in single file)
- **Maintainability Score:** 4/10
- **Testability:** Integration tests only, no unit tests for individual components
- **Extensibility:** Difficult to add new features without touching multiple areas
- **Code Organization:** All concerns mixed in one file

### Target State
- **Architecture:** Modular TypeScript with clear separation of concerns
- **Maintainability Score:** 9/10 (target)
- **Testability:** Full unit and integration test coverage
- **Extensibility:** Plugin-based architecture with clear extension points
- **Code Organization:** ~20 focused modules, each under 300 lines

### Why This Refactoring
This is a **hobby project with no time pressure**, making it the perfect opportunity to:
- ✅ Learn modern software architecture patterns
- ✅ Build something truly maintainable
- ✅ Use industry best practices (TypeScript, proper patterns)
- ✅ Create a codebase you'll be proud of
- ✅ Easy to extend with new features for years to come

---

## Current State Analysis

### Code Review Findings

#### 1. Decoupling (Score: 3/10)

**Issues:**
- `PlannerData` object violates Single Responsibility Principle (lines 1-352 in script.js)
  - Manages state
  - Manipulates DOM
  - Sets up event listeners
  - Handles business logic
- Section drag handlers tightly coupled to DOM, state, and browser APIs (lines 420-785)
- Item drag handlers duplicate the coupling pattern (lines 787-1013)
- Can't swap localStorage for IndexedDB without touching drag handlers
- Can't test drag logic without full DOM
- Can't reuse drag behavior for other components

#### 2. Maintainability (Score: 4/10)

**Issues:**
- **Code Duplication:**
  - Event listener setup in 3 places (lines 209-312, 315-345, 1065-1165)
  - Drag-over logic duplicated (lines 543-600, 627-723)
  - Element creation patterns repeated without abstraction

- **Magic Numbers/Strings:**
  ```javascript
  const pageHeight = isPortrait ? 297 : 210; // line 1181
  const pageHeightPx = pageHeight * 3.779527559; // line 1182
  const newId = `item-${Date.now()}`; // line 270
  ```

- **Long Functions:**
  - `handleSectionDragStart`: 62 lines
  - `handleColumnDragOver`: 97 lines
  - `setupSectionEventListeners`: 104 lines

- **Naming Inconsistencies:**
  - `draggable-item` (CSS) vs `draggableItems` (JS)
  - `PlannerData` (object) vs `plannerData` (localStorage key)

#### 3. Ease of Adding Features (Score: 4/10)

**Example:** Adding a new section type requires changes in:
1. `createSection` method (script.js:148-184)
2. `getCurrentState` method (script.js:5-58)
3. HTML structure for initial state
4. CSS for new styling
5. Event listener setup (script.js:209-312)

**No Extension Points:**
- Can't plug in custom drag behavior
- Can't add custom renderers for section types
- Can't intercept save/load lifecycle
- No hooks or events system

#### 4. Scalability (Score: 5/10)

**Performance Concerns:**
- Re-queries entire DOM on every save (line 7)
- Page break calculation has O(n²) complexity (lines 1190-1216)
- No event listener cleanup (memory leaks)
- Multiple forced reflows (lines 514, 755, 843)
- DOM thrashing (reading and writing rapidly)
- Entire state saved on every change (no dirty checking)
- No debouncing on frequent operations

#### 5. Code Organization (Score: 3/10)

**Current Structure:**
```
index.html (133 lines)
script.js (1,271 lines) ← MONOLITHIC
styles.css (552 lines)
tests/ (multiple files) ✓
```

**Issues:**
- All concerns in one file
- No clear boundaries between modules
- Hard to navigate and understand flow
- Difficult to find specific functionality

#### 6. Testing (Score: 6/10)

**Strengths:**
- Good integration test coverage
- Tests verify HTML structure and interactions

**Weaknesses:**
- Can't unit test individual functions (no exports)
- Tests require full DOM setup
- No tests for drag-and-drop logic (too complex to mock)
- Can't test state management independently
- No edge case tests

#### 7. Code Quality (Score: 5/10)

**Positives:**
- Consistent formatting
- Some helpful comments
- Descriptive variable names

**Issues:**
- No type safety
- Inconsistent error handling
- Browser compatibility not documented
- No input validation
- Accessibility could be improved (missing ARIA attributes)

---

## Why TypeScript

### 1. Catch Bugs Before Runtime

**JavaScript:**
```javascript
// Bug won't be caught until runtime
function addItem(section, item) {
    section.items.push(item);
}

addItem({ items: [] }, "oops"); // Runtime error
addItem({ itmes: [] }, {}); // Typo! Silent failure
```

**TypeScript:**
```typescript
interface Section {
    items: Item[];
}

function addItem(section: Section, item: Item): void {
    section.items.push(item);
}

addItem({ items: [] }, "oops"); // ❌ Compile error immediately
addItem({ itmes: [] }, {}); // ❌ Typo caught immediately
```

### 2. Self-Documenting Code

**JavaScript needs extensive JSDoc comments:**
```javascript
/**
 * @typedef {Object} SectionData
 * @property {string} id
 * @property {string} title
 * @property {ItemData[]} items
 * @property {boolean} isTextSection
 * ... 20 more lines of comments
 */
```

**TypeScript - types ARE documentation:**
```typescript
interface SectionData {
    id: string;
    title: string;
    items: ItemData[];
    isTextSection: boolean;
}
```

### 3. Amazing IDE Support

TypeScript provides:
- ✅ **Autocomplete** - IDE suggests all available properties/methods
- ✅ **Go to definition** - Jump to where anything is defined
- ✅ **Refactoring** - Rename properties everywhere safely
- ✅ **Inline documentation** - Hover to see types and docs
- ✅ **Error detection** - Red squiggles before you run code

### 4. Fearless Refactoring

**JavaScript:**
```javascript
// Change property name = manual search everywhere
class Section {
    constructor() {
        this.sectionTitle = ''; // Changed from 'title'
    }
}
// Hope you didn't miss any references!
```

**TypeScript:**
```typescript
interface Section {
    sectionTitle: string; // Changed from 'title'
}
// TypeScript shows ALL errors everywhere immediately
```

### 5. Industry Standard

- Used by Google, Microsoft, Airbnb, Slack, Spotify, etc.
- Most modern frameworks use TypeScript
- Great skill for portfolio/resume
- Massive ecosystem of typed libraries

### 6. Minimal Overhead

**Setup:**
```bash
npm create vite@latest audhd-planner -- --template vanilla-ts
```

**That's it!** Vite handles everything.

---

## Proposed Architecture

### File Structure

```
audhd-planner/
├── src/
│   ├── core/
│   │   ├── EventBus.ts              # Central pub/sub event system
│   │   ├── Component.ts             # Base component class with lifecycle
│   │   ├── App.ts                   # Application orchestrator
│   │   └── config.ts                # Application configuration
│   │
│   ├── models/
│   │   ├── Item.ts                  # Item data model + validation
│   │   ├── Section.ts               # Section data model + validation
│   │   ├── Planner.ts               # Root model (aggregates sections)
│   │   └── index.ts                 # Barrel exports
│   │
│   ├── services/
│   │   ├── storage/
│   │   │   ├── IStorageAdapter.ts       # Storage interface (contract)
│   │   │   ├── LocalStorageAdapter.ts   # localStorage implementation
│   │   │   ├── IndexedDBAdapter.ts      # IndexedDB implementation (future)
│   │   │   ├── MemoryAdapter.ts         # In-memory (for testing)
│   │   │   └── index.ts
│   │   ├── StateService.ts          # Manages app state + undo/redo
│   │   ├── DragService.ts           # Handles all drag operations
│   │   ├── PrintService.ts          # Print optimization logic
│   │   ├── ValidationService.ts     # Data validation
│   │   └── index.ts
│   │
│   ├── components/
│   │   ├── Section/
│   │   │   ├── Section.component.ts     # Section component logic
│   │   │   ├── Section.styles.css       # Component-specific styles
│   │   │   ├── SectionController.ts     # Section controller
│   │   │   └── types.ts                 # Component types
│   │   ├── Item/
│   │   │   ├── Item.component.ts
│   │   │   ├── Item.styles.css
│   │   │   ├── ItemController.ts
│   │   │   └── types.ts
│   │   ├── Header/
│   │   │   ├── Header.component.ts
│   │   │   └── Header.styles.css
│   │   ├── Planner/
│   │   │   ├── Planner.component.ts
│   │   │   └── Planner.styles.css
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── dom.ts                   # DOM utilities (createElement, etc.)
│   │   ├── validation.ts            # Validation helpers
│   │   ├── functional.ts            # debounce, throttle, compose, pipe
│   │   ├── constants.ts             # App-wide constants
│   │   ├── logger.ts                # Logging utility
│   │   └── index.ts
│   │
│   ├── types/
│   │   ├── events.ts                # Event type definitions
│   │   ├── models.ts                # Shared model types
│   │   ├── config.ts                # Configuration types
│   │   ├── global.d.ts              # Global type augmentations
│   │   └── index.ts
│   │
│   └── main.ts                      # Application entry point
│
├── styles/
│   ├── base.css                     # Reset + base styles
│   ├── layout.css                   # Grid, flexbox layouts
│   ├── print.css                    # Print-specific styles
│   ├── theme.css                    # Colors, spacing, typography
│   └── variables.css                # CSS custom properties
│
├── tests/
│   ├── unit/
│   │   ├── models/
│   │   │   ├── Item.test.ts
│   │   │   └── Section.test.ts
│   │   ├── services/
│   │   │   ├── StateService.test.ts
│   │   │   └── DragService.test.ts
│   │   └── utils/
│   │       └── functional.test.ts
│   ├── integration/
│   │   ├── planner.test.ts
│   │   └── storage.test.ts
│   └── e2e/
│       └── user-flows.test.ts
│
├── public/                          # Static assets
│   └── favicon.ico
│
├── docs/
│   ├── ARCHITECTURE.md              # Architecture documentation
│   ├── API.md                       # API documentation
│   ├── CONTRIBUTING.md              # Contribution guidelines
│   └── REFACTORING_PLAN.md          # This file
│
├── index.html
├── package.json
├── tsconfig.json                    # TypeScript configuration
├── vite.config.ts                   # Vite build configuration
└── README.md
```

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                    UI Components                        │
│  (Section, Item, Header, Planner - presentation only)   │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Controllers                          │
│    (Handle user interactions, coordinate components)    │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Services                             │
│  (Business logic, drag operations, state management)    │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Models                               │
│         (Data structures, validation, rules)            │
└─────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────┐
│                    Storage                              │
│         (Persistence layer - swappable adapters)        │
└─────────────────────────────────────────────────────────┘

                    All connected via
                    ↓
              ┌──────────────┐
              │  Event Bus   │
              └──────────────┘
```

### Design Patterns Used

1. **Observer Pattern** - EventBus for loose coupling
2. **Adapter Pattern** - Storage adapters (can swap implementations)
3. **Strategy Pattern** - Drag strategies for different drag types
4. **Component Pattern** - Self-contained UI components
5. **Service Layer Pattern** - Business logic separation
6. **Repository Pattern** - StateService as single source of truth
7. **Factory Pattern** - Creating sections/items
8. **Singleton Pattern** - EventBus, StateService instances

---

## Implementation Phases

### Phase 1: Foundation & Core Infrastructure (Week 1-2)

#### Goals
- Set up TypeScript build system
- Create core abstractions
- Establish patterns for rest of application

#### Tasks

**1.1 Project Setup**
- [ ] Initialize Vite with TypeScript template
- [ ] Configure tsconfig.json with strict mode
- [ ] Set up ESLint + Prettier for TypeScript
- [ ] Configure path aliases (@/ for src/)
- [ ] Set up testing framework (Vitest)

**1.2 Core Event System**
```typescript
// src/core/EventBus.ts
- [ ] Create EventBus class
- [ ] Implement on/off/once/emit methods
- [ ] Add priority support for listeners
- [ ] Add event history for debugging
- [ ] Write comprehensive tests
```

**1.3 Base Component Class**
```typescript
// src/core/Component.ts
- [ ] Create Component base class
- [ ] Implement lifecycle methods (render, onMount, onUnmount)
- [ ] Add state management (setState)
- [ ] Add event subscription tracking for cleanup
- [ ] Create helper methods (createElement)
- [ ] Write tests
```

**1.4 Configuration System**
```typescript
// src/core/config.ts
- [ ] Define AppConfig interface
- [ ] Create configuration object with all settings
- [ ] Make config immutable (readonly/as const)
- [ ] Add environment-based config overrides
- [ ] Document all configuration options
```

**1.5 Type Definitions**
```typescript
// src/types/events.ts
- [ ] Define EventMap interface
- [ ] Create event type definitions
- [ ] Add event callback types

// src/types/models.ts
- [ ] Define ItemData interface
- [ ] Define SectionData interface
- [ ] Define PlannerState interface

// src/types/config.ts
- [ ] Define all configuration types
```

**Deliverables:**
- ✅ Working TypeScript build
- ✅ EventBus with 100% test coverage
- ✅ Component base class
- ✅ Full type definitions
- ✅ Configuration system

**Success Criteria:**
- All TypeScript compiles with no errors
- Strict mode enabled and passing
- Tests pass at 100% coverage for core
- Clear documentation for all core APIs

---

### Phase 2: Models & Data Layer (Week 3)

#### Goals
- Create strongly-typed data models
- Implement validation
- Establish data transformation patterns

#### Tasks

**2.1 Item Model**
```typescript
// src/models/Item.ts
- [ ] Define ItemData interface
- [ ] Create Item class with validation
- [ ] Implement update/toggleChecked methods
- [ ] Add toJSON/fromJSON serialization
- [ ] Implement clone method
- [ ] Write comprehensive tests (all edge cases)
```

**2.2 Section Model**
```typescript
// src/models/Section.ts
- [ ] Define SectionData interface
- [ ] Create Section class with validation
- [ ] Implement addItem/removeItem/getItem methods
- [ ] Implement moveItem for reordering
- [ ] Add update method
- [ ] Add toJSON/fromJSON serialization
- [ ] Implement clone method
- [ ] Write comprehensive tests
```

**2.3 Planner Model**
```typescript
// src/models/Planner.ts
- [ ] Define PlannerState interface
- [ ] Create Planner class (root aggregate)
- [ ] Implement section management (add/remove/move)
- [ ] Implement column management
- [ ] Add orientation state
- [ ] Add toJSON/fromJSON serialization
- [ ] Write comprehensive tests
```

**2.4 Validation**
```typescript
// src/utils/validation.ts
- [ ] Create validation schemas
- [ ] Implement validate() function
- [ ] Add custom validators (max length, required, etc.)
- [ ] Add helpful error messages
- [ ] Write tests for all validators
```

**Deliverables:**
- ✅ Item model with full CRUD operations
- ✅ Section model with item management
- ✅ Planner model as root aggregate
- ✅ Comprehensive validation
- ✅ 100% test coverage for models

**Success Criteria:**
- All models are immutable where appropriate
- Validation prevents invalid states
- All edge cases covered in tests
- Models have no dependencies on DOM or services

---

### Phase 3: Services Layer (Week 4-5)

#### Goals
- Implement business logic
- Create storage abstraction
- Build state management with undo/redo

#### Tasks

**3.1 Storage Adapters**
```typescript
// src/services/storage/IStorageAdapter.ts
- [ ] Define IStorageAdapter interface
- [ ] Document contract with JSDoc

// src/services/storage/LocalStorageAdapter.ts
- [ ] Implement LocalStorageAdapter
- [ ] Handle quota exceeded errors
- [ ] Add JSON serialization
- [ ] Write tests with mock localStorage

// src/services/storage/MemoryAdapter.ts
- [ ] Implement in-memory storage (for testing)
- [ ] Write tests

// src/services/storage/IndexedDBAdapter.ts (optional)
- [ ] Design IndexedDB schema
- [ ] Implement adapter
- [ ] Add migration support
```

**3.2 State Service**
```typescript
// src/services/StateService.ts
- [ ] Create StateService class
- [ ] Implement save/load/reset
- [ ] Add undo/redo with history stack
- [ ] Implement state diffing (only save changes)
- [ ] Add autosave with debouncing
- [ ] Emit events on state changes
- [ ] Write comprehensive tests
```

**3.3 Drag Service**
```typescript
// src/services/DragService.ts
- [ ] Create DragService class
- [ ] Implement drag strategy pattern
- [ ] Handle section dragging
- [ ] Handle item dragging
- [ ] Manage placeholders
- [ ] Handle scroll during drag
- [ ] Emit drag events
- [ ] Write tests (with synthetic drag events)
```

**3.4 Print Service**
```typescript
// src/services/PrintService.ts
- [ ] Create PrintService class
- [ ] Implement page break calculation
- [ ] Handle portrait/landscape
- [ ] Optimize for printing
- [ ] Add print preview support
- [ ] Write tests
```

**3.5 Utilities**
```typescript
// src/utils/functional.ts
- [ ] Implement debounce
- [ ] Implement throttle
- [ ] Implement compose
- [ ] Implement pipe
- [ ] Write tests

// src/utils/dom.ts
- [ ] Create createElement helper
- [ ] Create element query helpers
- [ ] Add DOM measurement utilities
- [ ] Write tests

// src/utils/logger.ts
- [ ] Create Logger class
- [ ] Add log levels (debug, info, warn, error)
- [ ] Add conditional logging based on config
- [ ] Write tests
```

**Deliverables:**
- ✅ Working storage abstraction
- ✅ State management with undo/redo
- ✅ Drag and drop service
- ✅ Print optimization service
- ✅ Utility library
- ✅ 90%+ test coverage

**Success Criteria:**
- Can swap storage implementations easily
- Undo/redo works for all operations
- Drag service handles all edge cases
- Services have no UI dependencies

---

### Phase 4: UI Components (Week 6-7)

#### Goals
- Create reusable UI components
- Implement component lifecycle
- Connect to services via event bus

#### Tasks

**4.1 Item Component**
```typescript
// src/components/Item/Item.component.ts
- [ ] Extend Component base class
- [ ] Implement render method
- [ ] Handle checkbox clicks
- [ ] Handle text editing
- [ ] Emit events for state changes
- [ ] Add drag attributes
- [ ] Write component tests

// src/components/Item/Item.styles.css
- [ ] Component-specific styles
- [ ] Hover states
- [ ] Drag states
```

**4.2 Section Component**
```typescript
// src/components/Section/Section.component.ts
- [ ] Extend Component base class
- [ ] Implement render method
- [ ] Manage child Item components
- [ ] Handle add/remove item buttons
- [ ] Handle title editing
- [ ] Support text section variant
- [ ] Emit events for state changes
- [ ] Write component tests

// src/components/Section/Section.styles.css
- [ ] Component-specific styles
- [ ] List styles
- [ ] Header styles
```

**4.3 Header Component**
```typescript
// src/components/Header/Header.component.ts
- [ ] Extend Component base class
- [ ] Implement render method
- [ ] Handle add section button
- [ ] Handle orientation toggle
- [ ] Handle reset button
- [ ] Emit events for actions
- [ ] Write tests

// src/components/Header/Header.styles.css
- [ ] Header layout
- [ ] Button styles
```

**4.4 Planner Component**
```typescript
// src/components/Planner/Planner.component.ts
- [ ] Extend Component base class
- [ ] Implement render method
- [ ] Manage columns
- [ ] Manage child Section components
- [ ] Handle orientation changes
- [ ] Subscribe to state changes
- [ ] Write tests

// src/components/Planner/Planner.styles.css
- [ ] Column layout
- [ ] Responsive styles
- [ ] Print styles
```

**4.5 Controllers**
```typescript
// src/components/Section/SectionController.ts
- [ ] Create SectionController
- [ ] Connect Section component to services
- [ ] Handle user interactions
- [ ] Coordinate with DragService
- [ ] Write tests

// src/components/Item/ItemController.ts
- [ ] Create ItemController
- [ ] Connect Item component to services
- [ ] Handle user interactions
- [ ] Write tests
```

**Deliverables:**
- ✅ Fully functional UI components
- ✅ Component controllers
- ✅ Component-specific styles
- ✅ Event-driven architecture
- ✅ Component tests

**Success Criteria:**
- Components are truly reusable
- No direct service dependencies (use event bus)
- Components can be tested in isolation
- Proper cleanup on unmount (no memory leaks)

---

### Phase 5: Application Integration (Week 8)

#### Goals
- Wire everything together
- Implement initialization
- Add error handling

#### Tasks

**5.1 Application Class**
```typescript
// src/core/App.ts
- [ ] Create App class
- [ ] Initialize all services
- [ ] Create dependency injection container
- [ ] Bootstrap application
- [ ] Handle initialization errors
- [ ] Add cleanup on page unload
- [ ] Write integration tests
```

**5.2 Main Entry Point**
```typescript
// src/main.ts
- [ ] Import all dependencies
- [ ] Initialize App
- [ ] Set up error boundaries
- [ ] Add global error handlers
- [ ] Set up performance monitoring (optional)
```

**5.3 HTML Integration**
```html
<!-- index.html -->
- [ ] Update HTML structure
- [ ] Add root mount point
- [ ] Include compiled TypeScript
- [ ] Add loading state
- [ ] Add error fallback UI
```

**5.4 Error Handling**
```typescript
// src/utils/error-handler.ts
- [ ] Create ErrorHandler class
- [ ] Add error logging
- [ ] Add user-friendly error messages
- [ ] Add error recovery strategies
- [ ] Write tests
```

**5.5 Performance Optimization**
```typescript
// src/utils/performance.ts
- [ ] Add performance markers
- [ ] Implement lazy loading (if needed)
- [ ] Add bundle size analysis
- [ ] Optimize re-renders
```

**Deliverables:**
- ✅ Working integrated application
- ✅ Proper error handling
- ✅ Performance optimized
- ✅ Integration tests passing

**Success Criteria:**
- Application loads without errors
- All features work as in original
- Error handling prevents crashes
- Performance is equal or better than original

---

### Phase 6: Testing & Documentation (Week 9)

#### Goals
- Achieve high test coverage
- Document everything
- Create examples

#### Tasks

**6.1 Unit Tests**
```typescript
- [ ] Ensure all models have 100% coverage
- [ ] Ensure all services have 90%+ coverage
- [ ] Ensure all utilities have 100% coverage
- [ ] Add edge case tests
- [ ] Add error case tests
```

**6.2 Integration Tests**
```typescript
- [ ] Test complete user flows
- [ ] Test state persistence
- [ ] Test drag and drop
- [ ] Test undo/redo
- [ ] Test print functionality
```

**6.3 E2E Tests (Optional)**
```typescript
- [ ] Set up Playwright/Cypress
- [ ] Test critical user paths
- [ ] Test across browsers
```

**6.4 Documentation**
```markdown
// docs/ARCHITECTURE.md
- [ ] Document architecture decisions
- [ ] Explain patterns used
- [ ] Create component diagrams
- [ ] Document data flow

// docs/API.md
- [ ] Document public APIs
- [ ] Add code examples
- [ ] Document events
- [ ] Document configuration

// docs/CONTRIBUTING.md
- [ ] Set up contribution guidelines
- [ ] Explain project structure
- [ ] Add development setup instructions
```

**6.5 Code Comments**
```typescript
- [ ] Add JSDoc to all public methods
- [ ] Add inline comments for complex logic
- [ ] Add TODO comments for future work
- [ ] Generate API documentation with TypeDoc
```

**Deliverables:**
- ✅ 80%+ overall test coverage
- ✅ Complete documentation
- ✅ Examples and guides
- ✅ Generated API docs

**Success Criteria:**
- All tests passing
- Documentation is clear and complete
- New developer can onboard easily
- Code is self-explanatory

---

### Phase 7: Migration & Deployment (Week 10)

#### Goals
- Migrate existing data
- Deploy new version
- Monitor for issues

#### Tasks

**7.1 Data Migration**
```typescript
// src/utils/migration.ts
- [ ] Create migration script
- [ ] Handle old localStorage format
- [ ] Validate migrated data
- [ ] Add rollback capability
- [ ] Test migration with real data
```

**7.2 Build Optimization**
```typescript
- [ ] Configure Vite for production
- [ ] Enable minification
- [ ] Enable tree-shaking
- [ ] Analyze bundle size
- [ ] Add code splitting if needed
- [ ] Configure caching headers
```

**7.3 Deployment**
```bash
- [ ] Build production bundle
- [ ] Test production build locally
- [ ] Deploy to hosting (GitHub Pages, Netlify, etc.)
- [ ] Set up CI/CD (GitHub Actions)
- [ ] Add automated tests to CI
```

**7.4 Monitoring**
```typescript
- [ ] Add basic analytics (optional)
- [ ] Set up error tracking (Sentry, etc.) (optional)
- [ ] Monitor performance
- [ ] Gather user feedback
```

**Deliverables:**
- ✅ Production-ready build
- ✅ Data migration working
- ✅ Deployed application
- ✅ CI/CD pipeline

**Success Criteria:**
- Users can migrate their data seamlessly
- Application works in production
- No regressions from old version
- Monitoring in place

---

## Technical Specifications

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "outDir": "./dist",
    "rootDir": "./src",

    // Strict Type Checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    // Module Resolution
    "moduleResolution": "node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    // Source Maps
    "sourceMap": true,
    "declarationMap": true,

    // Path Mapping
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@models/*": ["src/models/*"],
      "@services/*": ["src/services/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    },

    // Emit
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@models': path.resolve(__dirname, './src/models'),
      '@services': path.resolve(__dirname, './src/services'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['node_modules/**']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
```

### Testing Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/index.ts'
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@models': path.resolve(__dirname, './src/models'),
      '@services': path.resolve(__dirname, './src/services'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types')
    }
  }
});
```

### Code Style Configuration

```json
// .eslintrc.json
{
  "parser": "@typescript-eslint/parser",
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "rules": {
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

```json
// .prettierrc.json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

---

## Migration Strategy

### Data Migration

**Step 1: Understand Current Data Format**
```javascript
// Current localStorage structure
{
  "sections": {
    "morning": {
      "title": "🕰️ Morning Routine",
      "items": [
        { "id": "wake-up", "text": "☀️ Wake Up", "checked": false }
      ],
      "isTextSection": false,
      "columnIndex": 0
    }
  },
  "columnsOrder": [["morning", "something-else"], ["homework", "sensory"], ...],
  "orientation": "landscape"
}
```

**Step 2: Create Migration Script**
```typescript
// src/utils/migration.ts
export class DataMigration {
  static readonly VERSION = '2.0.0';
  static readonly OLD_KEY = 'plannerData';
  static readonly NEW_KEY = 'plannerData_v2';

  /**
   * Migrate data from v1 to v2
   */
  static migrate(): boolean {
    const oldData = localStorage.getItem(this.OLD_KEY);
    if (!oldData) return false;

    try {
      const parsed = JSON.parse(oldData);
      const migrated = this.transformV1toV2(parsed);

      // Validate migrated data
      this.validate(migrated);

      // Save new format
      localStorage.setItem(this.NEW_KEY, JSON.stringify(migrated));

      // Backup old data
      localStorage.setItem(`${this.OLD_KEY}_backup`, oldData);

      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  /**
   * Transform v1 data structure to v2
   */
  private static transformV1toV2(oldData: any): PlannerState {
    // Transformation logic
    // Add timestamps, normalize IDs, etc.
  }

  /**
   * Rollback to old version
   */
  static rollback(): boolean {
    const backup = localStorage.getItem(`${this.OLD_KEY}_backup`);
    if (!backup) return false;

    localStorage.setItem(this.OLD_KEY, backup);
    localStorage.removeItem(this.NEW_KEY);
    return true;
  }
}
```

**Step 3: Run Migration on App Start**
```typescript
// src/main.ts
async function bootstrap() {
  try {
    // Attempt migration
    const migrated = DataMigration.migrate();
    if (migrated) {
      console.log('Data migrated successfully');
    }

    // Initialize app
    const app = new App();
    await app.init();
  } catch (error) {
    handleBootstrapError(error);
  }
}

bootstrap();
```

### Gradual Migration Approach

**Option 1: Big Bang (Recommended for hobby project)**
- Replace everything at once
- Easier to reason about
- Clean break from old code
- Single migration event

**Option 2: Strangler Fig Pattern**
- Migrate piece by piece
- Both versions run simultaneously
- More complex
- Lower risk but longer timeline

**We'll use Option 1** since this is a hobby project and we have time to test thoroughly.

---

## Testing Strategy

### Test Pyramid

```
        /\
       /  \        E2E Tests (5%)
      /────\       - Critical user flows
     /      \      - Cross-browser
    /────────\     Integration Tests (20%)
   /          \    - Component integration
  /────────────\   - Service integration
 /              \  Unit Tests (75%)
/────────────────\ - Models, Services, Utils
```

### Unit Testing

**Example: Item Model Tests**
```typescript
// tests/unit/models/Item.test.ts
import { describe, it, expect } from 'vitest';
import { Item } from '@models/Item';

describe('Item', () => {
  describe('constructor', () => {
    it('should create item with default values', () => {
      const item = new Item();
      expect(item.id).toBeDefined();
      expect(item.text).toBe('');
      expect(item.checked).toBe(false);
    });

    it('should create item with provided values', () => {
      const item = new Item({ text: 'Test', checked: true });
      expect(item.text).toBe('Test');
      expect(item.checked).toBe(true);
    });

    it('should throw on invalid data', () => {
      expect(() => new Item({ text: 'x'.repeat(501) }))
        .toThrow('Item text must be less than 500 characters');
    });
  });

  describe('toggleChecked', () => {
    it('should toggle checked state', () => {
      const item = new Item({ checked: false });
      item.toggleChecked();
      expect(item.checked).toBe(true);
      item.toggleChecked();
      expect(item.checked).toBe(false);
    });

    it('should update timestamp', () => {
      const item = new Item();
      const before = item.updatedAt;
      setTimeout(() => {
        item.toggleChecked();
        expect(item.updatedAt).toBeGreaterThan(before);
      }, 10);
    });
  });

  // ... more tests
});
```

### Integration Testing

**Example: StateService Integration Test**
```typescript
// tests/integration/state-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { StateService } from '@services/StateService';
import { MemoryAdapter } from '@services/storage/MemoryAdapter';
import { EventBus } from '@core/EventBus';

describe('StateService Integration', () => {
  let stateService: StateService;
  let eventBus: EventBus;
  let storage: MemoryAdapter;

  beforeEach(() => {
    eventBus = new EventBus();
    storage = new MemoryAdapter();
    stateService = new StateService(eventBus, storage);
  });

  it('should save and load state', () => {
    const state = createTestState();
    stateService.save(state);

    const loaded = stateService.load();
    expect(loaded).toEqual(state);
  });

  it('should emit events on state change', () => {
    const listener = vi.fn();
    eventBus.on('state:changed', listener);

    stateService.save(createTestState());

    expect(listener).toHaveBeenCalledOnce();
  });

  // ... more tests
});
```

### Test Coverage Goals

| Category | Target Coverage |
|----------|----------------|
| Models | 100% |
| Services | 90% |
| Utils | 100% |
| Components | 80% |
| Integration | 70% |
| **Overall** | **85%+** |

---

## Success Metrics

### Code Quality Metrics

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Lines per file | 1,271 (max) | < 300 | File analysis |
| Cyclomatic complexity | 15+ (some functions) | < 10 | ESLint complexity rule |
| Test coverage | ~50% (integration only) | 85%+ | Vitest coverage |
| Type coverage | 0% (JavaScript) | 100% | TypeScript strict mode |
| Duplicate code | ~40% | < 5% | SonarQube/manual review |
| Technical debt | High | Low | SonarQube debt ratio |

### Maintainability Metrics

| Metric | How to Measure | Target |
|--------|----------------|--------|
| Time to add new feature | Manual tracking | < 2 hours |
| Time to fix bug | Manual tracking | < 1 hour |
| New developer onboarding | Interview/survey | < 2 days |
| Code review time | PR metrics | < 30 min |
| Build time | CI metrics | < 2 min |

### Performance Metrics

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Initial load time | ~50ms | < 100ms | Lighthouse |
| Time to interactive | ~100ms | < 200ms | Lighthouse |
| Bundle size | ~15KB | < 50KB | Vite bundle analyzer |
| Memory usage | Unknown | Monitor | Chrome DevTools |
| Re-render time | Unknown | < 16ms | React DevTools profiler |

### User Experience Metrics

| Metric | Method | Target |
|--------|--------|--------|
| Feature parity | Manual checklist | 100% |
| Bug count | Issue tracking | 0 critical, < 5 minor |
| User satisfaction | Feedback | Maintain or improve |
| Accessibility score | Lighthouse | 100% |

---

## Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| TypeScript learning curve | Medium | Low | Take time, use docs, ask for help |
| Breaking existing features | Medium | High | Comprehensive testing, feature checklist |
| Performance regression | Low | Medium | Performance testing, profiling |
| Data migration failure | Low | High | Thorough testing, rollback plan |
| Browser compatibility | Low | Medium | Use polyfills, test on multiple browsers |
| Bundle size bloat | Low | Low | Code splitting, tree shaking |

### Process Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | Medium | Medium | Clear phases, stick to plan |
| Perfectionism paralysis | Medium | Low | Set "good enough" criteria |
| Burnout | Low | High | Take breaks, make it fun |
| Losing motivation | Low | High | Celebrate small wins, see progress |

### Mitigation Strategies

**For Technical Risks:**
1. **Comprehensive Testing** - Write tests as you go, not after
2. **Incremental Delivery** - Complete one phase before starting next
3. **Code Reviews** - Review your own code after 1 day
4. **Performance Budgets** - Set limits and monitor
5. **Feature Parity Checklist** - Verify all features work

**For Process Risks:**
1. **Stick to Plan** - Resist urge to add features during refactor
2. **Time Boxing** - Set max time per phase
3. **Regular Breaks** - Work in focused sessions
4. **Progress Tracking** - Check off tasks, see what's done
5. **Celebration** - Acknowledge completed phases

---

## Timeline

### Summary Timeline (10 weeks)

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Foundation | 2 weeks | EventBus, Component, Config, Types |
| Phase 2: Models | 1 week | Item, Section, Planner models |
| Phase 3: Services | 2 weeks | Storage, State, Drag, Print services |
| Phase 4: Components | 2 weeks | UI components, Controllers |
| Phase 5: Integration | 1 week | App class, main.ts, error handling |
| Phase 6: Testing & Docs | 1 week | Tests, documentation |
| Phase 7: Migration & Deploy | 1 week | Data migration, production deploy |

### Detailed Timeline

#### Weeks 1-2: Foundation
- **Days 1-2:** Project setup, Vite, TypeScript, ESLint
- **Days 3-5:** EventBus implementation + tests
- **Days 6-8:** Component base class + tests
- **Days 9-10:** Config system + all type definitions
- **Days 11-14:** Buffer for learning and refinement

#### Week 3: Models
- **Days 1-2:** Item model + tests
- **Days 3-4:** Section model + tests
- **Days 5-6:** Planner model + tests
- **Day 7:** Validation + buffer

#### Weeks 4-5: Services
- **Days 1-3:** Storage adapters + tests
- **Days 4-7:** StateService with undo/redo + tests
- **Days 8-10:** DragService + tests
- **Days 11-12:** PrintService + tests
- **Days 13-14:** Utilities + tests

#### Weeks 6-7: Components
- **Days 1-3:** Item component + controller + tests
- **Days 4-7:** Section component + controller + tests
- **Days 8-9:** Header component + tests
- **Days 10-12:** Planner component + tests
- **Days 13-14:** Polish and refinement

#### Week 8: Integration
- **Days 1-2:** App class + initialization
- **Days 3-4:** main.ts + HTML integration
- **Days 5-6:** Error handling + performance
- **Day 7:** Integration testing

#### Week 9: Testing & Documentation
- **Days 1-2:** Achieve test coverage goals
- **Days 3-4:** Write documentation
- **Days 5-6:** Code comments + API docs
- **Day 7:** Review and polish

#### Week 10: Migration & Deployment
- **Days 1-2:** Data migration + testing
- **Days 3-4:** Build optimization
- **Days 5-6:** Deployment + CI/CD
- **Day 7:** Monitoring + final review

### Flexible Timeline

Since this is a **hobby project**, the timeline is flexible:
- ✅ Take longer if you want to learn something deeply
- ✅ Take breaks between phases
- ✅ Adjust based on complexity
- ✅ No rush - quality over speed

---

## Next Steps

### Immediate Actions (This Week)

1. **Review this plan** - Read through, ask questions, suggest changes
2. **Set up development environment** - Install Node.js, VS Code, etc.
3. **Create project structure** - Initialize Vite project
4. **Start Phase 1** - Begin with EventBus

### Questions to Answer Before Starting

- [ ] Do we want to use Vite or manual TypeScript setup? (Recommend Vite)
- [ ] Do we want to set up CI/CD from day 1? (Recommend yes)
- [ ] Do we want to deploy to GitHub Pages or elsewhere?
- [ ] Do we want to add any additional features during refactor? (Recommend no)
- [ ] Do we want to use a CSS framework or keep vanilla CSS?
- [ ] Do we want to add E2E tests or just unit/integration?

### Resources

**TypeScript Learning:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [TypeScript Cheat Sheet](https://www.typescriptlang.org/cheatsheets)

**Architecture Patterns:**
- [Refactoring Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Component Pattern](https://www.patterns.dev/posts/component-pattern)
- [Observer Pattern](https://refactoring.guru/design-patterns/observer)

**Testing:**
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)

**Vite:**
- [Vite Documentation](https://vitejs.dev/)
- [Vite TypeScript Guide](https://vitejs.dev/guide/features.html#typescript)

---

## Conclusion

This refactoring plan transforms the AuDHD Planner from a **functional but monolithic application** into a **well-architected, maintainable, and extensible TypeScript application**.

### Key Benefits

1. **Type Safety** - Catch bugs before runtime
2. **Modularity** - Clear separation of concerns
3. **Testability** - 85%+ test coverage
4. **Maintainability** - Easy to understand and modify
5. **Extensibility** - Simple to add new features
6. **Learning** - Master modern development practices
7. **Pride** - A codebase you'll be proud to show

### Philosophy

> "The best time to plant a tree was 20 years ago. The second best time is now."

This refactoring is an investment in:
- Your learning and growth as a developer
- The long-term maintainability of the project
- The ability to add features easily in the future
- A portfolio piece showcasing your skills

### Let's Build Something Great! 🚀

---

**Document Version:** 1.0
**Last Updated:** 2025-11-02
**Author:** Claude (Anthropic)
**Reviewed By:** [To be filled]
**Approved By:** [To be filled]
