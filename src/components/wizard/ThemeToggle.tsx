import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore, type Theme } from '@/store/useThemeStore'

const CYCLE: Theme[] = ['light', 'dark', 'system']
const LABELS: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

/**
 * 3-way theme toggle: light → dark → system (follows browser).
 * Icon shows current state: Sun (light), Moon (dark), Monitor (system).
 * Requirements: THEME-01, THEME-03
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useThemeStore()
  const resolved = resolvedTheme()

  function handleToggle() {
    const idx = CYCLE.indexOf(theme)
    const next = CYCLE[(idx + 1) % CYCLE.length]!
    setTheme(next)
  }

  const icon =
    theme === 'system' ? <Monitor className="h-4 w-4" /> :
    resolved === 'dark' ? <Sun className="h-4 w-4" /> :
    <Moon className="h-4 w-4" />

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={`Theme: ${LABELS[theme]}. Click to switch.`}
      title={`Theme: ${LABELS[theme]}`}
    >
      {icon}
    </Button>
  )
}
