import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'presizion-theme';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: () => 'light' | 'dark';
}

function getOsPref(): 'light' | 'dark' {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyClass(theme: Theme): void {
  const resolved = theme === 'system' ? getOsPref() : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* ignore */ }
  return 'system';
}

const initialTheme = readStored();
// Apply class immediately so hydration matches anti-flash script
applyClass(initialTheme);

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,

  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch { /* ignore */ }
    applyClass(theme);
    set({ theme });
  },

  resolvedTheme: () => {
    const { theme } = get();
    return theme === 'system' ? getOsPref() : theme;
  },
}));

// Listen for OS preference changes — re-apply when in "system" mode
try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      applyClass('system');
    }
  });
} catch { /* matchMedia not available */ }
