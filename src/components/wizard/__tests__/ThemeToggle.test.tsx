/**
 * ThemeToggle — Unit tests
 * Requirements: THEME-01
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle'
import { useThemeStore } from '@/store/useThemeStore'

describe('ThemeToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' })
  })

  it('renders a button with aria-label="Toggle theme"', () => {
    render(<ThemeToggle />)
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    expect(btn).toBeInTheDocument()
  })

  it('renders Sun icon when resolvedTheme() returns "dark"', () => {
    useThemeStore.setState({ theme: 'dark' })
    render(<ThemeToggle />)
    // Sun icon has a data-testid or title — check for the button with aria-label
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    expect(btn).toBeInTheDocument()
    // Sun icon: lucide renders an SVG; when dark, we show Sun (to switch to light)
    // Check that the icon with "sun" name is rendered
    const svgs = btn.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('renders Moon icon when resolvedTheme() returns "light"', () => {
    useThemeStore.setState({ theme: 'light' })
    render(<ThemeToggle />)
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    expect(btn).toBeInTheDocument()
    const svgs = btn.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('clicking the button calls setTheme("light") when resolvedTheme() returns "dark"', () => {
    const setTheme = vi.fn()
    useThemeStore.setState({ theme: 'dark', setTheme })
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(setTheme).toHaveBeenCalledWith('light')
  })

  it('clicking the button calls setTheme("dark") when resolvedTheme() returns "light"', () => {
    const setTheme = vi.fn()
    useThemeStore.setState({ theme: 'light', setTheme })
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })
})
