/**
 * Unit tests for FileImportButton component
 * Tests rendering, file input, aria-label, and default enabled state
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileImportButton } from '../FileImportButton'

// Mock stores used by ImportPreviewModal (child component)
vi.mock('@/store/useClusterStore', () => ({
  useClusterStore: vi.fn(() => ({})),
}))

vi.mock('@/store/useScenariosStore', () => ({
  useScenariosStore: vi.fn(() => ({})),
}))

vi.mock('@/store/useImportStore', () => ({
  useImportStore: vi.fn(() => ({
    scopeOptions: [],
    activeScope: [],
    scopeLabels: {},
    rawByScope: null,
    setActiveScope: vi.fn(),
    setImportResult: vi.fn(),
  })),
}))

describe('FileImportButton', () => {
  describe('Test 1: renders the import button', () => {
    it('renders a button with accessible name "Import from file"', () => {
      render(<FileImportButton />)
      const button = screen.getByRole('button', { name: /import from file/i })
      expect(button).toBeInTheDocument()
    })

    it('displays "Import from file" text in the button', () => {
      render(<FileImportButton />)
      expect(screen.getByText('Import from file')).toBeInTheDocument()
    })
  })

  describe('Test 2: renders a hidden file input', () => {
    it('renders an input of type file', () => {
      render(<FileImportButton />)
      const input = document.querySelector('input[type="file"]')
      expect(input).toBeInTheDocument()
    })

    it('file input accepts .xlsx,.csv,.zip,.json extensions', () => {
      render(<FileImportButton />)
      const input = document.querySelector('input[type="file"]')
      expect(input).toHaveAttribute('accept', '.xlsx,.csv,.zip,.json')
    })

    it('file input has class "hidden"', () => {
      render(<FileImportButton />)
      const input = document.querySelector('input[type="file"]')
      expect(input).toHaveClass('hidden')
    })
  })

  describe('Test 3: button has correct aria-label', () => {
    it('button aria-label is "Import from file"', () => {
      render(<FileImportButton />)
      const button = screen.getByRole('button', { name: /import from file/i })
      expect(button).toHaveAttribute('aria-label', 'Import from file')
    })
  })

  describe('Test 4: button is not disabled by default', () => {
    it('button is enabled when not loading', () => {
      render(<FileImportButton />)
      const button = screen.getByRole('button', { name: /import from file/i })
      expect(button).not.toBeDisabled()
    })
  })
})
