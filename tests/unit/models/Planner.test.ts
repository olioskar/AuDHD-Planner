/**
 * Planner model tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Planner } from '@models/Planner';
import { Section } from '@models/Section';
import type { PlannerData, PlannerState } from '@types/models';

describe('Planner', () => {
  describe('constructor', () => {
    it('should create planner with default values', () => {
      const planner = new Planner();

      expect(planner.id).toBeDefined();
      expect(planner.id).toMatch(/^planner-\d+-[a-z0-9]+$/);
      expect(planner.orientation).toBe('portrait');
      expect(planner.version).toBe('2.0.0');
      expect(planner.columnsOrder).toEqual([[]]);
      expect(planner.getSectionCount()).toBe(0);
      expect(planner.createdAt).toBeGreaterThan(0);
      expect(planner.updatedAt).toBeGreaterThan(0);
    });

    it('should create planner with provided values', () => {
      const data: PlannerData = {
        id: 'custom-id',
        sections: [
          { id: 'section-1', title: 'Section 1' },
          { id: 'section-2', title: 'Section 2' },
        ],
        columnsOrder: [['section-1'], ['section-2']],
        orientation: 'landscape',
        version: '1.0.0',
        createdAt: 1000,
        updatedAt: 2000,
      };

      const planner = new Planner(data);

      expect(planner.id).toBe('custom-id');
      expect(planner.getSectionCount()).toBe(2);
      expect(planner.columnsOrder).toEqual([['section-1'], ['section-2']]);
      expect(planner.orientation).toBe('landscape');
      expect(planner.version).toBe('1.0.0');
      expect(planner.createdAt).toBe(1000);
      expect(planner.updatedAt).toBe(2000);
    });

    it('should convert section data to Section instances', () => {
      const planner = new Planner({
        sections: [{ title: 'Test' }],
      });

      const sections = planner.getSections();
      expect(sections).toHaveLength(1);
      expect(sections[0]).toBeInstanceOf(Section);
      expect(sections[0]?.title).toBe('Test');
    });

    it('should accept Section instances', () => {
      const section = new Section({ title: 'Existing' });
      const planner = new Planner({
        sections: [section],
      });

      const sections = planner.getSections();
      expect(sections).toHaveLength(1);
      expect(sections[0]).toBeInstanceOf(Section);
      expect(sections[0]?.id).toBe(section.id);
    });
  });

  describe('validation', () => {
    it('should validate successfully with valid data', () => {
      const planner = new Planner({ orientation: 'portrait' });
      const result = planner.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should throw on invalid orientation', () => {
      expect(() => {
        new Planner({ orientation: 'invalid' as any });
      }).toThrow('Planner orientation must be either "portrait" or "landscape"');
    });

    it('should throw on invalid version format', () => {
      expect(() => {
        new Planner({ version: 'invalid' });
      }).toThrow('Planner version must follow semantic versioning');
    });

    it('should throw on invalid columnsOrder', () => {
      expect(() => {
        new Planner({ columnsOrder: 'not-an-array' as any });
      }).toThrow('Planner columnsOrder must be an array');
    });

    it('should throw on invalid sections array', () => {
      expect(() => {
        new Planner({ sections: 'not-an-array' as any });
      }).toThrow('Planner sections must be an array');
    });

    it('should throw on too many columns', () => {
      const tooManyColumns = Array(11).fill([]);
      expect(() => {
        new Planner({ columnsOrder: tooManyColumns });
      }).toThrow('Planner cannot have more than 10 columns');
    });

    it('should throw on too many sections in a column', () => {
      const tooManySections = Array(21).fill('section-id');
      expect(() => {
        new Planner({ columnsOrder: [tooManySections] });
      }).toThrow('Column 0 cannot have more than 20 sections');
    });
  });

  describe('update()', () => {
    let planner: Planner;

    beforeEach(() => {
      planner = new Planner();
    });

    it('should update orientation', () => {
      planner.update({ orientation: 'landscape' });
      expect(planner.orientation).toBe('landscape');
    });

    it('should update version', () => {
      planner.update({ version: '3.0.0' });
      expect(planner.version).toBe('3.0.0');
    });

    it('should update columnsOrder', () => {
      planner.update({ columnsOrder: [['a'], ['b']] });
      expect(planner.columnsOrder).toEqual([['a'], ['b']]);
    });

    it('should update timestamp', () => {
      const originalUpdatedAt = planner.updatedAt;

      vi.useFakeTimers();
      vi.advanceTimersByTime(10);

      planner.update({ orientation: 'landscape' });

      expect(planner.updatedAt).toBeGreaterThan(originalUpdatedAt);

      vi.useRealTimers();
    });

    it('should validate after update', () => {
      expect(() => {
        planner.update({ version: 'invalid' });
      }).toThrow('Planner version must follow semantic versioning');
    });
  });

  describe('section management', () => {
    let planner: Planner;

    beforeEach(() => {
      planner = new Planner();
    });

    describe('addSection()', () => {
      it('should add section from SectionData', () => {
        const section = planner.addSection({ title: 'New Section' });

        expect(planner.getSectionCount()).toBe(1);
        expect(section).toBeInstanceOf(Section);
        expect(section.title).toBe('New Section');
      });

      it('should add existing Section instance', () => {
        const section = new Section({ title: 'Existing' });
        const added = planner.addSection(section);

        expect(planner.getSectionCount()).toBe(1);
        expect(added).toBe(section);
      });

      it('should update timestamp', () => {
        const originalUpdatedAt = planner.updatedAt;

        vi.useFakeTimers();
        vi.advanceTimersByTime(10);

        planner.addSection({ title: 'Test' });

        expect(planner.updatedAt).toBeGreaterThan(originalUpdatedAt);

        vi.useRealTimers();
      });
    });

    describe('removeSection()', () => {
      it('should remove section by ID', () => {
        const section = planner.addSection({ title: 'Section' });
        const removed = planner.removeSection(section.id);

        expect(removed).toBe(section);
        expect(planner.getSectionCount()).toBe(0);
      });

      it('should return null if section not found', () => {
        const removed = planner.removeSection('non-existent');

        expect(removed).toBeNull();
      });

      it('should remove section from columns', () => {
        const section = planner.addSection({ title: 'Section' });
        planner.addSectionToColumn(section.id, 0);

        planner.removeSection(section.id);

        expect(planner.getColumnSections(0)).toEqual([]);
      });
    });

    describe('getSection()', () => {
      it('should get section by ID', () => {
        const section = planner.addSection({ title: 'Test' });
        const found = planner.getSection(section.id);

        expect(found).toBe(section);
      });

      it('should return undefined if not found', () => {
        const found = planner.getSection('non-existent');

        expect(found).toBeUndefined();
      });
    });

    describe('hasSection()', () => {
      it('should return true if section exists', () => {
        const section = planner.addSection({ title: 'Test' });

        expect(planner.hasSection(section.id)).toBe(true);
      });

      it('should return false if section does not exist', () => {
        expect(planner.hasSection('non-existent')).toBe(false);
      });
    });

    describe('getSections()', () => {
      it('should return all sections as array', () => {
        planner.addSection({ title: 'Section 1' });
        planner.addSection({ title: 'Section 2' });

        const sections = planner.getSections();

        expect(sections).toHaveLength(2);
        expect(sections.every((s) => s instanceof Section)).toBe(true);
      });
    });

    describe('clearSections()', () => {
      it('should remove all sections', () => {
        planner.addSection({ title: 'Section 1' });
        planner.addSection({ title: 'Section 2' });

        planner.clearSections();

        expect(planner.getSectionCount()).toBe(0);
      });

      it('should clear all columns', () => {
        const section = planner.addSection({ title: 'Section' });
        planner.addSectionToColumn(section.id, 0);

        planner.clearSections();

        expect(planner.columnsOrder).toEqual([[]]);
      });
    });
  });

  describe('column management', () => {
    let planner: Planner;
    let section1: Section;
    let section2: Section;
    let section3: Section;

    beforeEach(() => {
      planner = new Planner();
      section1 = planner.addSection({ title: 'Section 1' });
      section2 = planner.addSection({ title: 'Section 2' });
      section3 = planner.addSection({ title: 'Section 3' });
    });

    describe('addSectionToColumn()', () => {
      it('should add section to column', () => {
        planner.addSectionToColumn(section1.id, 0);

        expect(planner.getColumnSections(0)).toEqual([section1.id]);
      });

      it('should create columns as needed', () => {
        planner.addSectionToColumn(section1.id, 5);

        expect(planner.getColumnCount()).toBeGreaterThanOrEqual(6);
        expect(planner.getColumnSections(5)).toEqual([section1.id]);
      });

      it('should add section at specified position', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.addSectionToColumn(section2.id, 0);
        planner.addSectionToColumn(section3.id, 0, 1);

        expect(planner.getColumnSections(0)).toEqual([
          section1.id,
          section3.id,
          section2.id,
        ]);
      });

      it('should remove section from other columns', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.addSectionToColumn(section1.id, 1);

        expect(planner.getColumnSections(0)).toEqual([]);
        expect(planner.getColumnSections(1)).toEqual([section1.id]);
      });

      it('should throw if section does not exist', () => {
        expect(() => {
          planner.addSectionToColumn('non-existent', 0);
        }).toThrow('Section non-existent does not exist in planner');
      });

      it('should update section columnIndex', () => {
        planner.addSectionToColumn(section1.id, 2);

        expect(section1.columnIndex).toBe(2);
      });
    });

    describe('removeSectionFromColumns()', () => {
      it('should remove section from all columns', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.addSectionToColumn(section2.id, 0);

        const removed = planner.removeSectionFromColumns(section1.id);

        expect(removed).toBe(true);
        expect(planner.getColumnSections(0)).toEqual([section2.id]);
      });

      it('should return false if section not in any column', () => {
        const removed = planner.removeSectionFromColumns(section1.id);

        expect(removed).toBe(false);
      });
    });

    describe('moveSectionToColumn()', () => {
      it('should move section to different column', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.moveSectionToColumn(section1.id, 1);

        expect(planner.getColumnSections(0)).toEqual([]);
        expect(planner.getColumnSections(1)).toEqual([section1.id]);
      });
    });

    describe('moveSectionInColumn()', () => {
      it('should move section within same column', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.addSectionToColumn(section2.id, 0);
        planner.addSectionToColumn(section3.id, 0);

        planner.moveSectionInColumn(section1.id, 2);

        expect(planner.getColumnSections(0)).toEqual([
          section2.id,
          section3.id,
          section1.id,
        ]);
      });

      it('should return false if section not in any column', () => {
        const result = planner.moveSectionInColumn(section1.id, 0);

        expect(result).toBe(false);
      });

      it('should throw on invalid position', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.addSectionToColumn(section2.id, 0);

        expect(() => {
          planner.moveSectionInColumn(section1.id, 10);
        }).toThrow('Invalid position');
      });
    });

    describe('getColumnSections()', () => {
      it('should return section IDs in column', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.addSectionToColumn(section2.id, 0);

        expect(planner.getColumnSections(0)).toEqual([section1.id, section2.id]);
      });

      it('should return empty array for invalid column', () => {
        expect(planner.getColumnSections(100)).toEqual([]);
      });

      it('should return copy of array', () => {
        planner.addSectionToColumn(section1.id, 0);
        const sections = planner.getColumnSections(0);
        sections.push('modified');

        expect(planner.getColumnSections(0)).toEqual([section1.id]);
      });
    });

    describe('addColumn()', () => {
      it('should add new empty column', () => {
        const index = planner.addColumn();

        expect(index).toBe(planner.getColumnCount() - 1);
        expect(planner.getColumnSections(index)).toEqual([]);
      });
    });

    describe('removeColumn()', () => {
      it('should remove column and return section IDs', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.addSectionToColumn(section2.id, 0);

        const removed = planner.removeColumn(0);

        expect(removed).toEqual([section1.id, section2.id]);
        expect(planner.getColumnCount()).toBe(1); // At least one column remains
      });

      it('should return empty array for invalid column', () => {
        const removed = planner.removeColumn(100);

        expect(removed).toEqual([]);
      });

      it('should ensure at least one column exists', () => {
        planner.removeColumn(0);

        expect(planner.getColumnCount()).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('queries', () => {
    let planner: Planner;
    let section1: Section;
    let section2: Section;
    let section3: Section;

    beforeEach(() => {
      planner = new Planner();
      section1 = planner.addSection({ title: 'Section 1' });
      section2 = planner.addSection({ title: 'Section 2' });
      section3 = planner.addSection({ title: 'Section 3' });
    });

    describe('findSectionColumn()', () => {
      it('should find column containing section', () => {
        planner.addSectionToColumn(section1.id, 2);

        expect(planner.findSectionColumn(section1.id)).toBe(2);
      });

      it('should return -1 if section not in any column', () => {
        expect(planner.findSectionColumn(section1.id)).toBe(-1);
      });
    });

    describe('getSectionsInColumn()', () => {
      it('should return Section instances in column', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.addSectionToColumn(section2.id, 0);

        const sections = planner.getSectionsInColumn(0);

        expect(sections).toHaveLength(2);
        expect(sections[0]).toBe(section1);
        expect(sections[1]).toBe(section2);
      });

      it('should return empty array for invalid column', () => {
        expect(planner.getSectionsInColumn(100)).toEqual([]);
      });
    });

    describe('getOrphanedSections()', () => {
      it('should return sections not in any column', () => {
        planner.addSectionToColumn(section1.id, 0);

        const orphaned = planner.getOrphanedSections();

        expect(orphaned).toHaveLength(2);
        expect(orphaned).toContain(section2);
        expect(orphaned).toContain(section3);
      });

      it('should return empty array if all sections are in columns', () => {
        planner.addSectionToColumn(section1.id, 0);
        planner.addSectionToColumn(section2.id, 0);
        planner.addSectionToColumn(section3.id, 0);

        expect(planner.getOrphanedSections()).toEqual([]);
      });
    });
  });

  describe('serialization', () => {
    describe('toJSON() and fromJSON()', () => {
      it('should serialize to JSON', () => {
        const planner = new Planner({ orientation: 'landscape' });
        planner.addSection({ title: 'Test' });

        const json = planner.toJSON();

        expect(json.orientation).toBe('landscape');
        expect(json.sections).toHaveLength(1);
      });

      it('should deserialize from JSON', () => {
        const json: PlannerData = {
          id: 'test',
          sections: [{ title: 'Test' }],
          columnsOrder: [['section-id']],
          orientation: 'portrait',
          version: '2.0.0',
        };

        const planner = Planner.fromJSON(json);

        expect(planner.id).toBe('test');
        expect(planner.getSectionCount()).toBe(1);
        expect(planner.columnsOrder).toEqual([['section-id']]);
      });

      it('should round-trip through JSON', () => {
        const original = new Planner({ orientation: 'landscape' });
        original.addSection({ title: 'Test' });

        const json = original.toJSON();
        const restored = Planner.fromJSON(json);

        expect(restored.equals(original)).toBe(true);
      });
    });

    describe('toState() and fromState()', () => {
      it('should serialize to state format', () => {
        const planner = new Planner();
        const section = planner.addSection({ title: 'Test' });
        planner.addSectionToColumn(section.id, 0);

        const state = planner.toState();

        expect(state.sections).toBeDefined();
        expect(Object.keys(state.sections)).toHaveLength(1);
        expect(state.columnsOrder).toEqual([[section.id]]);
        expect(state.lastModified).toBe(planner.updatedAt);
      });

      it('should deserialize from state format', () => {
        const state: PlannerState = {
          sections: {
            'section-1': { id: 'section-1', title: 'Section 1' },
          },
          columnsOrder: [['section-1']],
          orientation: 'portrait',
          version: '2.0.0',
          lastModified: 1000,
        };

        const planner = Planner.fromState(state);

        expect(planner.getSectionCount()).toBe(1);
        expect(planner.columnsOrder).toEqual([['section-1']]);
        expect(planner.updatedAt).toBe(1000);
      });
    });
  });

  describe('clone()', () => {
    it('should create new planner with different ID', () => {
      const original = new Planner({ orientation: 'landscape' });
      original.addSection({ title: 'Section' });

      const cloned = original.clone();

      expect(cloned.id).not.toBe(original.id);
      expect(cloned.orientation).toBe(original.orientation);
      expect(cloned.getSectionCount()).toBe(1);
    });

    it('should clone sections with new IDs', () => {
      const original = new Planner();
      const section = original.addSection({ title: 'Section' });

      const cloned = original.clone();
      const clonedSections = cloned.getSections();

      expect(clonedSections[0]?.id).not.toBe(section.id);
      expect(clonedSections[0]?.title).toBe(section.title);
    });
  });

  describe('cloneExact()', () => {
    it('should create exact copy with same ID', () => {
      const original = new Planner({
        id: 'test-id',
        orientation: 'landscape',
        createdAt: 1000,
        updatedAt: 2000,
      });

      const cloned = original.cloneExact();

      expect(cloned.id).toBe(original.id);
      expect(cloned.createdAt).toBe(original.createdAt);
      expect(cloned.updatedAt).toBe(original.updatedAt);
    });
  });

  describe('equals()', () => {
    it('should return true for identical planners', () => {
      const planner1 = new Planner({
        id: 'same-id',
        orientation: 'portrait',
        version: '2.0.0',
        createdAt: 1000,
        updatedAt: 2000,
      });

      const planner2 = new Planner({
        id: 'same-id',
        orientation: 'portrait',
        version: '2.0.0',
        createdAt: 1000,
        updatedAt: 2000,
      });

      expect(planner1.equals(planner2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const planner1 = new Planner({ id: 'id1' });
      const planner2 = new Planner({ id: 'id2' });

      expect(planner1.equals(planner2)).toBe(false);
    });

    it('should return false for different sections', () => {
      const planner1 = new Planner({ id: 'same' });
      const planner2 = new Planner({ id: 'same' });

      planner1.addSection({ title: 'Section' });

      expect(planner1.equals(planner2)).toBe(false);
    });

    it('should return false for different columnsOrder', () => {
      const planner1 = new Planner({ id: 'same', columnsOrder: [['a']] });
      const planner2 = new Planner({ id: 'same', columnsOrder: [['b']] });

      expect(planner1.equals(planner2)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should show planner summary', () => {
      const planner = new Planner({ orientation: 'landscape' });
      planner.addSection({ title: 'Section 1' });
      planner.addSection({ title: 'Section 2' });

      expect(planner.toString()).toBe('Planner (2 sections, 1 columns, landscape)');
    });
  });
});
