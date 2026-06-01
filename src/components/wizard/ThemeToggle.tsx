import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { type Theme, useThemeStore } from '@/store/useThemeStore';

const CYCLE: Theme[] = ['light', 'dark', 'system'];

/**
 * 3-way theme toggle: light → dark → system (follows browser).
 * Icon shows current state: Sun (light), Moon (dark), Monitor (system).
 * Requirements: THEME-01, THEME-03
 */
export function ThemeToggle() {
  const { t } = useTranslation('wizard');
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const resolved = resolvedTheme();

  const LABELS: Record<Theme, string> = {
    light: t('themeToggle.light'),
    dark: t('themeToggle.dark'),
    system: t('themeToggle.system'),
  };

  function handleToggle() {
    const idx = CYCLE.indexOf(theme);
    const next = CYCLE[(idx + 1) % CYCLE.length]!;
    setTheme(next);
  }

  const icon =
    theme === 'system' ? (
      <Monitor className="h-4 w-4" />
    ) : resolved === 'dark' ? (
      <Sun className="h-4 w-4" />
    ) : (
      <Moon className="h-4 w-4" />
    );

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={t('themeToggle.ariaLabel', { theme: LABELS[theme] })}
      title={t('themeToggle.title', { theme: LABELS[theme] })}
    >
      {icon}
    </Button>
  );
}
