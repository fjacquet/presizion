import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── localStorage stub ──────────────────────────────────────────────────────
// The LanguageDetector accesses window.localStorage and caches its availability
// result in a module-level variable on first call.  ES module imports are
// hoisted before any top-level code, so vi.stubGlobal at the top of the file
// would still run AFTER the import is evaluated.
//
// Solution: stub the global BEFORE the module loads by using vi.hoisted(),
// then import dynamically so we control the order.

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(store)) delete store[k];
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

// vi.hoisted runs before all imports — place the stub here so the
// LanguageDetector sees window.localStorage when it first probes availability.
vi.hoisted(() => {
  const store2: Record<string, string> = {};
  const mock = {
    getItem: (key: string) => store2[key] ?? null,
    setItem: (key: string, value: string) => {
      store2[key] = value;
    },
    removeItem: (key: string) => {
      delete store2[key];
    },
    clear: () => {
      for (const k of Object.keys(store2)) delete store2[k];
    },
    get length() {
      return Object.keys(store2).length;
    },
    key: (index: number) => Object.keys(store2)[index] ?? null,
  };
  // Assign on globalThis so window.localStorage (which equals globalThis.localStorage
  // in jsdom) is set before the LanguageDetector module evaluates.
  Object.assign(globalThis, { localStorage: mock });
  if (typeof globalThis.window !== 'undefined') {
    (globalThis.window as unknown as Record<string, unknown>).localStorage = mock;
  }
});

import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from '../config';
import i18n from '../index';

describe('locale smoke', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
    // Reset spy counts after the beforeAll changeLanguage
    localStorageMock.setItem.mockClear();
    for (const k of Object.keys(store)) delete store[k];
  });

  beforeEach(() => {
    localStorageMock.setItem.mockClear();
    localStorageMock.getItem.mockClear();
    for (const k of Object.keys(store)) delete store[k];
  });

  it('all supported languages resolve common:appTagline to a non-empty string', async () => {
    for (const lng of SUPPORTED_LANGUAGES) {
      await i18n.changeLanguage(lng);
      const value = i18n.t('common:appTagline');
      expect(value).toBeTruthy();
      expect(value).not.toBe('common:appTagline');
    }
  });

  it('changeLanguage persists to localStorage', async () => {
    // Directly verify the LanguageDetector caches via window.localStorage.
    // We capture what was written to the hoisted stub's globalThis.localStorage.
    await i18n.changeLanguage('fr');
    // The LanguageDetector calls window.localStorage.setItem(key, lng).
    // We verify the key is present in the global localStorage.
    const ls = (globalThis as unknown as { localStorage: Storage }).localStorage;
    expect(ls.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
  });
});
