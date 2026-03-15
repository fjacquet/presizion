/**
 * ThemeToggle -- Unit tests
 * Requirements: THEME-01, THEME-03
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../ThemeToggle'
import { useThemeStore } from '@/store/useThemeStore'

describe('ThemeToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' })
  })

  it('renders a button with theme label', () => {
    render(<ThemeToggle />)
    const btn = screen.getByRole('button', { name: /theme/i })
    expect(btn).toBeInTheDocument()
  })

  it('shows Monitor icon when theme is "system"', () => {
    useThemeStore.setState({ theme: 'system' })
    render(<ThemeToggle />)
    const btn = screen.getByRole('button', { name: /system/i })
    expect(btn).toBeInTheDocument()
    expect(btn.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('cycles light -> dark -> system -> light', () => {
    const setTheme = vi.fn()
    useThemeStore.setState({ theme: 'light', setTheme })
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /theme/i }))
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('cycles dark -> system', () => {
    const setTheme = vi.fn()
    useThemeStore.setState({ theme: 'dark', setTheme })
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /theme/i }))
    expect(setTheme).toHaveBeenCalledWith('system')
  })

  it('cycles system -> light', () => {
    const setTheme = vi.fn()
    useThemeStore.setState({ theme: 'system', setTheme })
    render(<ThemeToggle />)
    fireEvent.click(screen.getByRole('button', { name: /theme/i }))
    expect(setTheme).toHaveBeenCalledWith('light')
  })
})
