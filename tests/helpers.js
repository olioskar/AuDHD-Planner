// Test helper functions for AuDHD Planner
const fs = require('fs');
const path = require('path');

/**
 * Load HTML content into the test DOM
 */
function loadHTML() {
  const htmlPath = path.resolve(__dirname, '../index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // Parse HTML and inject into document
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  
  // Copy head content
  document.head.innerHTML = doc.head.innerHTML;
  
  // Copy body content
  document.body.innerHTML = doc.body.innerHTML;
}

/**
 * Load CSS styles into the test DOM
 */
function loadCSS() {
  const cssPath = path.resolve(__dirname, '../styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  
  const style = document.createElement('style');
  style.textContent = cssContent;
  document.head.appendChild(style);
}

/**
 * Load and execute the main script
 */
function loadScript() {
  const scriptPath = path.resolve(__dirname, '../script.js');
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  
  // Execute the script content in the current context
  eval(scriptContent);
}

/**
 * Setup complete test environment with HTML, CSS, and JS
 */
function setupTestEnvironment() {
  loadHTML();
  loadCSS();
  // Note: We'll load the script in individual tests to control timing
}

/**
 * Create a mock drag event
 */
function createMockDragEvent(type, options = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  
  // Add DataTransfer mock
  event.dataTransfer = {
    setData: jest.fn(),
    getData: jest.fn(),
    clearData: jest.fn(),
    setDragImage: jest.fn(),
    effectAllowed: 'move',
    dropEffect: 'move'
  };
  
  // Add clientX/Y for position calculations
  event.clientX = options.clientX || 100;
  event.clientY = options.clientY || 100;
  
  return event;
}

/**
 * Create a mock section element for testing
 */
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

/**
 * Create a mock draggable item for testing
 */
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

/**
 * Wait for DOM events to complete
 */
function waitForEvents() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Simulate a complete drag and drop operation
 */
async function simulateDragAndDrop(dragElement, dropTarget) {
  // Start drag
  const dragStartEvent = createMockDragEvent('dragstart');
  dragElement.dispatchEvent(dragStartEvent);
  
  await waitForEvents();
  
  // Drag over target
  const dragOverEvent = createMockDragEvent('dragover');
  dropTarget.dispatchEvent(dragOverEvent);
  
  await waitForEvents();
  
  // Drop
  const dropEvent = createMockDragEvent('drop');
  dropEvent.dataTransfer.getData.mockReturnValue(dragElement.dataset.id || dragElement.closest('.planner-section')?.dataset.section);
  dropTarget.dispatchEvent(dropEvent);
  
  await waitForEvents();
  
  // End drag
  const dragEndEvent = createMockDragEvent('dragend');
  dragElement.dispatchEvent(dragEndEvent);
  
  await waitForEvents();
}

module.exports = {
  loadHTML,
  loadCSS,
  loadScript,
  setupTestEnvironment,
  createMockDragEvent,
  createMockSection,
  createMockItem,
  waitForEvents,
  simulateDragAndDrop
};
