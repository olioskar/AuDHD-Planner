/**
 * Print service for optimizing A4 printing
 * Handles page breaks, layout, and print-specific styling
 */

import type { EventBus } from '@core/EventBus';
import { config } from '@core/config';

/**
 * Page orientation
 */
export type PageOrientation = 'portrait' | 'landscape';

/**
 * Print options
 */
export interface PrintOptions {
  /** Page orientation */
  orientation?: PageOrientation;
  /** Show print preview before printing */
  preview?: boolean;
  /** Include timestamp in print */
  includeTimestamp?: boolean;
  /** Page margins in mm */
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

/**
 * Page break info
 */
export interface PageBreakInfo {
  pageNumber: number;
  elementBefore: string | null;
  elementAfter: string | null;
  position: number;
}

/**
 * Print service
 *
 * Features:
 * - A4 page break calculation
 * - Portrait/landscape support
 * - Print preview
 * - Print-optimized styling
 *
 * @example
 * ```typescript
 * const printService = new PrintService({ eventBus });
 *
 * await printService.print({
 *   orientation: 'portrait',
 *   preview: true,
 * });
 * ```
 */
export class PrintService {
  private eventBus: EventBus;

  /**
   * Create a new PrintService
   *
   * @param options - Service configuration
   */
  constructor(options: { eventBus: EventBus }) {
    this.eventBus = options.eventBus;
  }

  /**
   * Trigger print dialog with specified options
   *
   * @param options - Print options
   */
  async print(options: PrintOptions = {}): Promise<void> {
    const orientation = options.orientation ?? 'portrait';
    const preview = options.preview ?? false;
    const includeTimestamp = options.includeTimestamp ?? false;

    try {
      // Emit print start event
      this.eventBus.emit('print:start', { options });

      // Apply print-specific styles
      this.applyPrintStyles(orientation);

      // Add timestamp if requested
      if (includeTimestamp) {
        this.addTimestamp();
      }

      // Calculate and insert page breaks
      const pageBreaks = this.calculatePageBreaks(orientation);
      this.insertPageBreaks(pageBreaks);

      // Show preview or print immediately
      if (preview) {
        await this.showPrintPreview();
      } else {
        window.print();
      }

      // Emit print complete event
      this.eventBus.emit('print:complete', { options });
    } catch (error) {
      this.eventBus.emit('print:error', {
        error: error instanceof Error ? error.message : 'Print failed',
      });
      throw error;
    } finally {
      // Cleanup
      this.removePrintStyles();
      this.removeTimestamp();
      this.removePageBreaks();
    }
  }

  /**
   * Calculate optimal page breaks based on page size
   *
   * @param orientation - Page orientation
   * @returns Array of page break positions
   */
  calculatePageBreaks(orientation: PageOrientation): PageBreakInfo[] {
    const pageHeight = this.getPageHeight(orientation);
    const pageBreaks: PageBreakInfo[] = [];

    // Get all sections in the DOM
    const sections = document.querySelectorAll('[data-section]');
    let currentPageHeight = 0;
    let pageNumber = 1;

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const sectionHeight = rect.height;

      // Check if section would overflow page
      if (currentPageHeight + sectionHeight > pageHeight) {
        // Insert page break before this section
        pageBreaks.push({
          pageNumber,
          elementBefore: index > 0 ? sections[index - 1]?.getAttribute('data-section') : null,
          elementAfter: section.getAttribute('data-section'),
          position: currentPageHeight,
        });

        currentPageHeight = sectionHeight;
        pageNumber++;
      } else {
        currentPageHeight += sectionHeight;
      }
    });

    return pageBreaks;
  }

  /**
   * Insert page break elements into the DOM
   *
   * @param pageBreaks - Page break information
   */
  insertPageBreaks(pageBreaks: PageBreakInfo[]): void {
    pageBreaks.forEach((breakInfo) => {
      if (!breakInfo.elementAfter) return;

      const element = document.querySelector(
        `[data-section="${breakInfo.elementAfter}"]`
      );

      if (element) {
        const pageBreak = document.createElement('div');
        pageBreak.className = 'print-page-break';
        pageBreak.style.pageBreakBefore = 'always';
        pageBreak.style.breakBefore = 'page';
        pageBreak.setAttribute('data-print-break', 'true');

        element.parentNode?.insertBefore(pageBreak, element);
      }
    });
  }

  /**
   * Remove page break elements from the DOM
   */
  removePageBreaks(): void {
    const pageBreaks = document.querySelectorAll('[data-print-break]');
    pageBreaks.forEach((el) => el.remove());
  }

  /**
   * Apply print-specific styles to the document
   *
   * @param orientation - Page orientation
   */
  applyPrintStyles(orientation: PageOrientation): void {
    const styleId = 'print-service-styles';

    // Remove existing styles
    document.getElementById(styleId)?.remove();

    // Create style element
    const style = document.createElement('style');
    style.id = styleId;

    const pageSize = this.getPageSize(orientation);

    style.textContent = `
      @media print {
        @page {
          size: ${pageSize};
          margin: 10mm;
        }

        body {
          margin: 0;
          padding: 0;
        }

        .no-print {
          display: none !important;
        }

        .print-only {
          display: block !important;
        }

        [data-section] {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .print-page-break {
          page-break-before: always;
          break-before: page;
        }

        /* Avoid breaking checkboxes and their labels */
        .item, .checklist-item {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Remove print-specific styles from the document
   */
  removePrintStyles(): void {
    const styleId = 'print-service-styles';
    document.getElementById(styleId)?.remove();
  }

  /**
   * Add timestamp to the document
   */
  addTimestamp(): void {
    const timestampId = 'print-timestamp';

    // Remove existing timestamp
    document.getElementById(timestampId)?.remove();

    // Create timestamp element
    const timestamp = document.createElement('div');
    timestamp.id = timestampId;
    timestamp.className = 'print-only print-timestamp';
    timestamp.textContent = `Printed: ${new Date().toLocaleString()}`;
    timestamp.style.cssText = `
      display: none;
      position: fixed;
      bottom: 10px;
      right: 10px;
      font-size: 10px;
      color: #666;
    `;

    document.body.appendChild(timestamp);
  }

  /**
   * Remove timestamp from the document
   */
  removeTimestamp(): void {
    const timestampId = 'print-timestamp';
    document.getElementById(timestampId)?.remove();
  }

  /**
   * Show print preview (opens print dialog)
   */
  async showPrintPreview(): Promise<void> {
    return new Promise((resolve) => {
      // Wait a bit for styles to apply
      setTimeout(() => {
        window.print();
        resolve();
      }, 100);
    });
  }

  /**
   * Get page height in pixels for a given orientation
   *
   * @param orientation - Page orientation
   * @returns Page height in pixels
   */
  getPageHeight(orientation: PageOrientation): number {
    const a4 = config.page.sizes.a4[orientation];
    // Convert mm to pixels (assuming 96 DPI)
    return config.page.mmToPx(a4.height);
  }

  /**
   * Get page width in pixels for a given orientation
   *
   * @param orientation - Page orientation
   * @returns Page width in pixels
   */
  getPageWidth(orientation: PageOrientation): number {
    const a4 = config.page.sizes.a4[orientation];
    // Convert mm to pixels (assuming 96 DPI)
    return config.page.mmToPx(a4.width);
  }

  /**
   * Get CSS page size string
   *
   * @param orientation - Page orientation
   * @returns CSS page size string
   */
  getPageSize(orientation: PageOrientation): string {
    return `A4 ${orientation}`;
  }

  /**
   * Estimate number of pages for current content
   *
   * @param orientation - Page orientation
   * @returns Estimated page count
   */
  estimatePageCount(orientation: PageOrientation): number {
    const pageHeight = this.getPageHeight(orientation);
    const contentHeight = document.body.scrollHeight;

    return Math.ceil(contentHeight / pageHeight);
  }

  /**
   * Check if browser supports print
   *
   * @returns True if print is supported
   */
  static isPrintSupported(): boolean {
    return typeof window !== 'undefined' && typeof window.print === 'function';
  }
}
