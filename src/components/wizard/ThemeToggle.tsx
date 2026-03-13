import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/store/useThemeStore'

/**
 * Sun/Moon icon button that toggles between light and dark theme.
 * When dark mode is active: shows Sun (clicking will switch to light).
 * When light mode is active: shows Moon (clicking will switch to dark).
 * Requirements: THEME-01
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useThemeStore()
  const resolved = resolvedTheme()

  function handleToggle() {
    setTheme(resolved === 'light' ? 'dark' : 'light')
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label="Toggle theme"
    >
      {resolved === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}
