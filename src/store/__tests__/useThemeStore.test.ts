import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// We must set up localStorage mock BEFORE importing the store,
// because the store calls readStored() at module load time.
const localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key]; }),
  clear: vi.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }),
  get length() { return Object.keys(localStorageStore).length; },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
};

vi.stubGlobal('localStorage', localStorageMock);

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Import store AFTER globals are set up
import { useThemeStore } from '../useThemeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    // Clear localStorage mock store
    Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]);
    // Reset all mock call records
    vi.clearAllMocks();
    // Remove dark class
    document.documentElement.classList.remove('dark');
    // Restore default matchMedia (non-dark)
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    // Re-stub with our persistent mocks so store still works between tests
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe('initial theme from localStorage', () => {
    it('initial theme is "system" when localStorage has no entry', () => {
      // No entry in localStorage — store should report 'system'
      useThemeStore.setState({ theme: 'system' });
      const state = useThemeStore.getState();
      expect(state.theme).toBe('system');
    });

    it('initial theme is "dark" when localStorage contains "dark"', () => {
      useThemeStore.setState({ theme: 'dark' });
      const state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
    });

    it('initial theme is "light" when localStorage contains "light"', () => {
      useThemeStore.setState({ theme: 'light' });
      const state = useThemeStore.getState();
      expect(state.theme).toBe('light');
    });
  });

  describe('setTheme', () => {
    it('setTheme("dark") sets theme to "dark", writes localStorage, adds "dark" class to document.documentElement', () => {
      useThemeStore.setState({ theme: 'system' });
      document.documentElement.classList.remove('dark');
      useThemeStore.getState().setTheme('dark');
      const state = useThemeStore.getState();
      expect(state.theme).toBe('dark');
      expect(localStorageStore['presizion-theme']).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('setTheme("light") sets theme to "light", writes localStorage, removes "dark" class from document.documentElement', () => {
      document.documentElement.classList.add('dark');
      useThemeStore.setState({ theme: 'dark' });
      useThemeStore.getState().setTheme('light');
      const state = useThemeStore.getState();
      expect(state.theme).toBe('light');
      expect(localStorageStore['presizion-theme']).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('setTheme("system") sets theme to "system", writes localStorage', () => {
      useThemeStore.setState({ theme: 'dark' });
      useThemeStore.getState().setTheme('system');
      const state = useThemeStore.getState();
      expect(state.theme).toBe('system');
      expect(localStorageStore['presizion-theme']).toBe('system');
    });
  });

  describe('resolvedTheme', () => {
    it('resolvedTheme() returns "dark" when theme is "dark"', () => {
      useThemeStore.setState({ theme: 'dark' });
      const { resolvedTheme } = useThemeStore.getState();
      expect(resolvedTheme()).toBe('dark');
    });

    it('resolvedTheme() returns "light" when theme is "light"', () => {
      useThemeStore.setState({ theme: 'light' });
      const { resolvedTheme } = useThemeStore.getState();
      expect(resolvedTheme()).toBe('light');
    });

    it('resolvedTheme() returns OS pref "dark" when theme is "system" and OS prefers dark', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      useThemeStore.setState({ theme: 'system' });
      const { resolvedTheme } = useThemeStore.getState();
      expect(resolvedTheme()).toBe('dark');
    });

    it('resolvedTheme() returns OS pref "light" when theme is "system" and OS prefers light', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
      useThemeStore.setState({ theme: 'system' });
      const { resolvedTheme } = useThemeStore.getState();
      expect(resolvedTheme()).toBe('light');
    });
  });
});
