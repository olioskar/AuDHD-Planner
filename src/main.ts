/**
 * Main application entry point
 * Bootstraps the TypeScript application with all components
 */

import { eventBus } from '@core/EventBus';
import { config } from '@core/config';
import { Planner } from '@models/Planner';
import { StateService } from '@/services/StateService';
import { LocalStorageAdapter } from '@/services/storage/LocalStorageAdapter';
import { PrintService } from '@/services/PrintService';
import { DragService } from '@/services/DragService';
import { PlannerComponent } from '@/components/PlannerComponent';

import './style.css';
import './components/styles.css';

console.log(`${config.app.name} v${config.app.version}`);

/**
 * Initialize and start the application
 */
async function initApp() {
  // Initialize services
  const storage = new LocalStorageAdapter('audhd-planner');
  const stateService = new StateService({
    storageAdapter: storage,
    eventBus,
    storageKey: 'planner-state',
    maxHistorySize: 50,
    autosave: true,
    autosaveDelay: 1000,
  });

  const printService = new PrintService({ eventBus });
  new DragService({ eventBus });

  // Try to load saved state
  let planner = await stateService.loadState();

  // If no saved state, create a new planner with default sections
  if (!planner) {
    planner = new Planner({ orientation: 'portrait' });

    // Add some default sections
    const section1 = planner.addSection({
      title: '📋 Today\'s Tasks',
      items: [
        { text: 'Click to check off items', checked: false },
        { text: 'Double-click to edit text', checked: false },
        { text: 'Drag items between sections', checked: false },
      ],
    });

    const section2 = planner.addSection({
      title: '💭 Notes',
      isTextSection: true,
      textContent: 'This is a text section.\n\nYou can write notes here!',
      placeholder: 'Write your notes here...',
    });

    const section3 = planner.addSection({
      title: '✨ Ideas',
      items: [
        { text: 'Drag sections between columns', checked: false },
        { text: 'Use the print button to print', checked: false },
      ],
    });

    // Organize into columns
    planner.addSectionToColumn(section1.id, 0);
    planner.addSectionToColumn(section2.id, 1);
    planner.addSectionToColumn(section3.id, 2);

    // Save initial state
    await stateService.setState(planner, 'Initial state', false);
    await stateService.saveState();
  }

  // Handle print events
  eventBus.on('print:start', async () => {
    await printService.print({
      orientation: planner?.orientation ?? 'portrait',
      preview: true,
      includeTimestamp: true,
    });
  });

  // Initialize UI
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  // Clear app container
  app.innerHTML = '';

  // Mount planner component
  const plannerComponent = new PlannerComponent({
    planner,
    stateService,
    eventBus,
  });

  plannerComponent.mount(app);

  console.log('✅ Application initialized successfully!');
  console.log('📊 Sections:', planner.getSectionCount());
  console.log('📋 Columns:', planner.getColumnCount());
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initApp().catch((error) => {
    console.error('Failed to initialize app:', error);

    // Show error to user
    const app = document.querySelector<HTMLDivElement>('#app');
    if (app) {
      app.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
          <h1>⚠️ Error</h1>
          <p>Failed to initialize the application.</p>
          <p><small>${error instanceof Error ? error.message : 'Unknown error'}</small></p>
          <button onclick="location.reload()">Reload Page</button>
        </div>
      `;
    }
  });
});
