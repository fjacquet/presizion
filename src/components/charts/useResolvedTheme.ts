import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store/useThemeStore';

/**
 * Returns the currently resolved 'light' | 'dark', reacting to BOTH the
 * manual toggle (Zustand `theme`) AND OS changes while in 'system' mode.
 * Used to key/remount the ECharts instance (its theme is fixed at init).
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useThemeStore((s) => s.theme);
  const [osDark, setOsDark] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setOsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return theme === 'system' ? (osDark ? 'dark' : 'light') : theme;
}
