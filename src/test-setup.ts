import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

// jsdom in this config does not expose a usable `localStorage`. Provide a
// working in-memory implementation BEFORE importing i18n, so the i18next
// LanguageDetector (caches: ['localStorage']) can persist selections and any
// store/persistence code under test has real storage.
function createLocalStorage(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

const localStorageImpl = createLocalStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageImpl,
  configurable: true,
  writable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageImpl,
    configurable: true,
    writable: true,
  });
}

// Initialize i18next globally so components using useTranslation() resolve
// against the `en` resources during tests (tests don't import main.tsx).
// Dynamic import runs AFTER the localStorage shim above is installed.
const { default: i18n } = await import('@/i18n');

// Recharts/ECharts ResponsiveContainer requires ResizeObserver which jsdom lacks
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom does not implement matchMedia, which useIsMobile() relies on.
// Provide a non-matching stub so responsive hooks resolve during tests.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}

// Force English before each test for deterministic, locale-independent assertions.
beforeEach(() => {
  if (i18n.language !== 'en') void i18n.changeLanguage('en');
});
