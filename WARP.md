# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is the AuDHD Kids Planner - a printable daily planner designed specifically for kids with AuDHD (Autism and ADHD). It's a vanilla JavaScript web application with drag-and-drop functionality for customizable task organization.

**Live Demo**: https://olioskar.github.io/AuDHD-Planner/  
**License**: Creative Commons Attribution-NonCommercial 4.0 International  
**Entry Point**: `index.html`

## Architecture

### Core Components

- **PlannerData**: Central state management object that handles all data persistence and DOM synchronization
  - Manages localStorage serialization/deserialization
  - Handles section and item creation with proper event binding
  - Maintains column layout and orientation state

- **Drag & Drop System**: Two separate drag systems that must not interfere with each other
  - Section-level dragging (via h2 headers) for reordering sections between columns
  - Item-level dragging for reordering tasks within and between sections

- **Section Types**: Two distinct section types with different data models
  - **List sections**: Task lists with checkboxes, add/remove functionality
  - **Text sections**: Free-form text areas (e.g., "Happy Moment" section)

### File Structure

- `index.html` - Complete HTML structure with default planner layout
- `script.js` - All JavaScript functionality (~1270 lines)
- `styles.css` - CSS with print-optimized A4 layouts and responsive design
- `tests/` - Jest test suite with comprehensive coverage

## Common Development Commands

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

### Development Workflow
```bash
# Start development (just open index.html in browser)
open index.html

# View coverage report after running tests
open coverage/index.html

# Run single test file
npm test -- dragAndDrop.test.js

# Run tests matching pattern
npm test -- --testNamePattern="getCurrentState"
```

## Key Implementation Details

### State Management
- All state is managed through the `PlannerData` object
- State automatically saves to localStorage on any change
- State includes section data, column layout, and orientation
- Hidden sections are excluded from state saving to prevent corruption

### Drag & Drop Architecture
- **Critical**: Section dragging and item dragging use completely separate event handlers
- Section dragging is initiated via h2 headers with `draggable="true"`
- Item dragging uses li elements within sortable lists
- Both systems use custom placeholder elements to prevent scroll jumping

### Event Binding Patterns
- Event listeners are set up through `PlannerData.setupSectionEventListeners()`
- Double-click to edit text content (sections and items)
- Checkbox clicking toggles checked state
- All changes trigger `PlannerData.save()`

### Print Optimization
- A4 dimensions: 297mm × 210mm (landscape) or 210mm × 297mm (portrait)
- Print media queries hide UI elements (buttons, etc.)
- Page break controls prevent sections from splitting across pages
- Visual A4 guides show during editing

## Testing Strategy

### Test Files Structure
- `setup.js` - Jest configuration and mocks for DOM/localStorage
- `plannerData.test.js` - Core state management functionality
- `dragAndDrop.test.js` - Drag and drop interactions
- `localStorage.test.js` - Data persistence
- `integration.test.js` - End-to-end workflows
- `helpers.js` - Shared test utilities

### Key Test Patterns
- Use JSDOM to load actual HTML file for realistic testing
- Mock localStorage, getBoundingClientRect, and drag events
- Test both section-level and item-level operations
- Verify state persistence and restoration

## Development Guidelines

### Adding New Sections
1. Create section with proper data attributes and structure
2. Add event listeners via `PlannerData.setupSectionEventListeners()`
3. Ensure section appears in state management
4. Test drag and drop functionality

### Modifying State Structure
- Update `getCurrentState()` to capture new data
- Update `applyState()` to restore new data
- Update `createSection()` to handle new section types
- Add corresponding tests

### Print Layout Changes
- Test in both portrait and landscape orientations
- Verify A4 dimensions are maintained
- Check page break behavior with `break-inside: avoid`
- Test that UI elements are hidden in print mode

### Accessibility Considerations
- This is specifically designed for AuDHD kids
- Maintain visual clarity with Comic Sans font
- Preserve emoji icons for visual categorization
- Keep drag handles large and easy to use