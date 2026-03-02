import { describe, it, expect } from 'vitest';
import { MAIN_NAV, BOTTOM_NAV } from './navigation';
import type { NavItem, NavSection } from './navigation';

describe('MAIN_NAV', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(MAIN_NAV)).toBe(true);
    expect(MAIN_NAV.length).toBeGreaterThan(0);
  });

  it('each section has an items array', () => {
    MAIN_NAV.forEach((section: NavSection) => {
      expect(Array.isArray(section.items)).toBe(true);
    });
  });

  it('each nav item has required fields: label, labelKo, href, icon', () => {
    const allItems = MAIN_NAV.flatMap((section) => section.items);
    allItems.forEach((item: NavItem) => {
      expect(typeof item.label).toBe('string');
      expect(item.label.length).toBeGreaterThan(0);

      expect(typeof item.labelKo).toBe('string');
      expect(item.labelKo.length).toBeGreaterThan(0);

      expect(typeof item.href).toBe('string');
      expect(item.href.length).toBeGreaterThan(0);

      // Lucide icons are forwardRef objects (typeof === 'object'), not plain functions
      expect(item.icon).toBeTruthy();
    });
  });

  it('all href values start with /', () => {
    const allItems = MAIN_NAV.flatMap((section) => section.items);
    allItems.forEach((item: NavItem) => {
      expect(item.href).toMatch(/^\//);
    });
  });

  it('badge field is either undefined, "new", or "pro" when present', () => {
    const allItems = MAIN_NAV.flatMap((section) => section.items);
    allItems.forEach((item: NavItem) => {
      if (item.badge !== undefined) {
        expect(['new', 'pro']).toContain(item.badge);
      }
    });
  });

  it('contains expected top-level routes', () => {
    const allHrefs = MAIN_NAV.flatMap((section) => section.items.map((item) => item.href));
    expect(allHrefs).toContain('/dashboard');
    expect(allHrefs).toContain('/favorites');
    expect(allHrefs).toContain('/collections');
  });

  it('sections with a title also have titleKo', () => {
    MAIN_NAV.forEach((section: NavSection) => {
      if (section.title !== undefined) {
        expect(typeof section.titleKo).toBe('string');
        expect((section.titleKo as string).length).toBeGreaterThan(0);
      }
    });
  });
});

describe('BOTTOM_NAV', () => {
  it('is an array', () => {
    expect(Array.isArray(BOTTOM_NAV)).toBe(true);
  });

  it('each item has required fields when non-empty', () => {
    BOTTOM_NAV.forEach((item: NavItem) => {
      expect(typeof item.label).toBe('string');
      expect(typeof item.href).toBe('string');
      // Lucide icons are forwardRef objects (typeof === 'object'), not plain functions
      expect(item.icon).toBeTruthy();
    });
  });
});
