/**
 * Unit tests for ScopeBadge component
 * Tests rendering, dialog behavior, and scope re-selection
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ScopeBadge } from '../ScopeBadge'
import * as importStoreModule from '@/store/useImportStore'

// Mock useImportStore
vi.mock('@/store/useImportStore', () => ({
  useImportStore: vi.fn(),
}))

// Fixtures
const mockSetActiveScope = vi.fn()

const MULTI_SCOPE_RAW_BY_SCOPE = new Map([
  ['DC1||CL-A', { totalVcpus: 80, totalVms: 40, totalDiskGb: 800, avgRamPerVmGb: 8, vmCount: 40, existingServerCount: 4, warnings: [] }],
  ['DC1||CL-B', { totalVcpus: 40, totalVms: 20, totalDiskGb: 400, avgRamPerVmGb: 10, vmCount: 20, existingServerCount: 3, warnings: [] }],
])

const MULTI_SCOPE_STATE = {
  scopeOptions: ['DC1||CL-A', 'DC1||CL-B'],
  activeScope: ['DC1||CL-A', 'DC1||CL-B'],
  scopeLabels: { 'DC1||CL-A': 'CL-A (DC1)', 'DC1||CL-B': 'CL-B (DC1)' },
  rawByScope: MULTI_SCOPE_RAW_BY_SCOPE,
  setActiveScope: mockSetActiveScope,
}

const SINGLE_SCOPE_STATE = {
  scopeOptions: ['__all__'],
  activeScope: ['__all__'],
  scopeLabels: { __all__: 'All' },
  rawByScope: null,
  setActiveScope: mockSetActiveScope,
}

const EMPTY_STATE = {
  scopeOptions: [],
  activeScope: [],
  scopeLabels: {},
  rawByScope: null,
  setActiveScope: mockSetActiveScope,
}

function setupStore(state: typeof MULTI_SCOPE_STATE | typeof SINGLE_SCOPE_STATE | typeof EMPTY_STATE) {
  vi.mocked(importStoreModule.useImportStore).mockImplementation(
    (selector: Parameters<typeof importStoreModule.useImportStore>[0]) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      selector(state as any)
  )
}

describe('ScopeBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Test 1: renders null for 0 or 1 scope options', () => {
    it('returns null when scopeOptions is empty', () => {
      setupStore(EMPTY_STATE)
      const { container } = render(<ScopeBadge />)
      expect(container.firstChild).toBeNull()
    })

    it('returns null when scopeOptions has exactly 1 entry', () => {
      setupStore(SINGLE_SCOPE_STATE)
      const { container } = render(<ScopeBadge />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Test 2: renders active scope labels for multi-scope', () => {
    it('shows active scope labels joined with comma when scopeOptions.length > 1', () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      expect(screen.getByText('CL-A (DC1) (4 hosts), CL-B (DC1) (3 hosts)')).toBeInTheDocument()
    })

    it('renders "Scope:" label text', () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      expect(screen.getByText('Scope:')).toBeInTheDocument()
    })
  })

  describe('Test 3: Pencil icon button rendered for multi-scope', () => {
    it('renders edit button with aria-label "Edit scope"', () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      expect(screen.getByRole('button', { name: /edit scope/i })).toBeInTheDocument()
    })
  })

  describe('Test 4: clicking Pencil opens dialog', () => {
    it('dialog becomes visible after clicking the edit button', async () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      const editBtn = screen.getByRole('button', { name: /edit scope/i })
      await userEvent.click(editBtn)
      expect(screen.getByText('Select active clusters')).toBeInTheDocument()
    })
  })

  describe('Test 5: dialog renders one Checkbox per scopeOption', () => {
    it('renders two checkboxes for two scope options', async () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      await userEvent.click(screen.getByRole('button', { name: /edit scope/i }))
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
    })

    it('renders scope labels with host count in dialog', async () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      await userEvent.click(screen.getByRole('button', { name: /edit scope/i }))
      expect(screen.getByText('CL-A (DC1) (4 hosts)')).toBeInTheDocument()
      expect(screen.getByText('CL-B (DC1) (3 hosts)')).toBeInTheDocument()
    })
  })

  describe('Test 6: active scope checkboxes are checked', () => {
    it('checkboxes for activeScope keys are checked on dialog open', async () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      await userEvent.click(screen.getByRole('button', { name: /edit scope/i }))
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach((cb) => {
        expect(cb).toBeChecked()
      })
    })

    it('checkboxes for non-active scopes are unchecked', async () => {
      const partialState = {
        ...MULTI_SCOPE_STATE,
        activeScope: ['DC1||CL-A'], // Only CL-A active
      }
      setupStore(partialState)
      render(<ScopeBadge />)
      await userEvent.click(screen.getByRole('button', { name: /edit scope/i }))
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).not.toBeChecked()
    })
  })

  describe('Test 7: Apply calls setActiveScope', () => {
    it('clicking Apply calls setActiveScope with selected scope keys', async () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      await userEvent.click(screen.getByRole('button', { name: /edit scope/i }))
      const applyBtn = screen.getByRole('button', { name: /apply/i })
      await userEvent.click(applyBtn)
      expect(mockSetActiveScope).toHaveBeenCalledWith(
        expect.arrayContaining(['DC1||CL-A', 'DC1||CL-B'])
      )
    })
  })

  describe('Test 8: Apply closes dialog', () => {
    it('dialog is no longer visible after clicking Apply', async () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      await userEvent.click(screen.getByRole('button', { name: /edit scope/i }))
      expect(screen.getByText('Select active clusters')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /apply/i }))
      expect(screen.queryByText('Select active clusters')).not.toBeInTheDocument()
    })
  })

  describe('Test 10 (SCOPE-10): host count displayed in scope labels', () => {
    it('shows host count in badge text when rawByScope has existingServerCount', () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      expect(screen.getByText(/4 hosts/)).toBeInTheDocument()
      expect(screen.getByText(/3 hosts/)).toBeInTheDocument()
    })

    it('does not show host count when rawByScope is null', () => {
      setupStore({
        scopeOptions: ['DC1||CL-A', 'DC1||CL-B'],
        activeScope: ['DC1||CL-A', 'DC1||CL-B'],
        scopeLabels: { 'DC1||CL-A': 'CL-A (DC1)', 'DC1||CL-B': 'CL-B (DC1)' },
        rawByScope: null,
        setActiveScope: mockSetActiveScope,
      } as unknown as Parameters<typeof setupStore>[0])
      render(<ScopeBadge />)
      expect(screen.getByText('CL-A (DC1), CL-B (DC1)')).toBeInTheDocument()
      expect(screen.queryByText(/hosts/)).not.toBeInTheDocument()
    })
  })

  describe('Test 9: Cancel closes dialog without calling setActiveScope', () => {
    it('Cancel does not call setActiveScope', async () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      await userEvent.click(screen.getByRole('button', { name: /edit scope/i }))
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(mockSetActiveScope).not.toHaveBeenCalled()
    })

    it('dialog is no longer visible after clicking Cancel', async () => {
      setupStore(MULTI_SCOPE_STATE)
      render(<ScopeBadge />)
      await userEvent.click(screen.getByRole('button', { name: /edit scope/i }))
      expect(screen.getByText('Select active clusters')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
      expect(screen.queryByText('Select active clusters')).not.toBeInTheDocument()
    })
  })
})
