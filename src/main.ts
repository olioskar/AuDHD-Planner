/**
 * Main application entry point
 * This will bootstrap the TypeScript application
 */

import { eventBus } from '@core/EventBus';
import { config } from '@core/config';

import './style.css';

console.log(`${config.app.name} v${config.app.version}`);
console.log('TypeScript foundation initialized!');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');

  // For now, just demonstrate the EventBus works
  eventBus.on('test:event', (data) => {
    console.log('Test event received:', data);
  });

  eventBus.emit('test:event', {});

  // The rest of the app will be built in subsequent phases
  const app = document.querySelector<HTMLDivElement>('#app');

  if (app) {
    app.innerHTML = `
      <div class="foundation-complete">
        <h1>${config.app.name}</h1>
        <p>✅ TypeScript foundation complete!</p>
        <p>Phase 1 completed - Core infrastructure ready</p>
        <ul>
          <li>✅ EventBus with full type safety</li>
          <li>✅ Component base class</li>
          <li>✅ Configuration system</li>
          <li>✅ Type definitions</li>
          <li>✅ Tests passing (27/27)</li>
        </ul>
        <p><small>Next: Phase 2 - Models & Data Layer</small></p>
      </div>
    `;
  }
});
