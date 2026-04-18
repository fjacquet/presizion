import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const { localStorageStore, localStorageMock } = vi.hoisted(() => {
  const store: Record<string, string> = {}
  const mock = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (index: number) => Object.keys(store)[index] ?? null,
  }
  ;(globalThis as { localStorage: Storage }).localStorage = mock as unknown as Storage
  return { localStorageStore: store, localStorageMock: mock }
})

import { VmExclusionPanel } from '../VmExclusionPanel'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import type { VmRow } from '@/lib/utils/import'

const rows: VmRow[] = [
  { name: 'web01', scopeKey: 's1', vcpus: 4, ramMib: 8192, diskMib: 102400, powerState: 'poweredOn' },
  { name: 'test-a', scopeKey: 's1', vcpus: 2, ramMib: 4096, diskMib: 51200, powerState: 'poweredOn' },
  { name: 'test-b', scopeKey: 's1', vcpus: 2, ramMib: 4096, diskMib: 51200, powerState: 'poweredOff' },
]

describe('VmExclusionPanel', () => {
  beforeEach(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
    vi.stubGlobal('localStorage', localStorageMock)
    useExclusionsStore.getState().reset()
  })

  it('shows 0 excluded with empty rules', () => {
    render(<VmExclusionPanel rows={rows} />)
    expect(screen.getByText(/Excluded: 0 of 3/)).toBeInTheDocument()
  })

  it('updates counts live when namePattern changes', () => {
    render(<VmExclusionPanel rows={rows} />)
    const input = screen.getByLabelText(/Name patterns/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test-*' } })
    expect(screen.getByText(/Excluded: 2 of 3/)).toBeInTheDocument()
    expect(screen.getByText(/2 by name pattern/)).toBeInTheDocument()
  })

  it('disables power-state toggle when no row has powerState', () => {
    const rowsNoPower: VmRow[] = rows.map(({ name, scopeKey, vcpus, ramMib, diskMib }) => ({
      name, scopeKey, vcpus, ramMib, diskMib,
    }))
    render(<VmExclusionPanel rows={rowsNoPower} />)
    const cb = screen.getByRole('checkbox', { name: /Exclude powered-off/i })
    expect(cb).toHaveAttribute('aria-disabled', 'true')
  })

  it('round-trips a per-row tick between exclude and include', () => {
    render(<VmExclusionPanel rows={rows} />)
    fireEvent.click(screen.getByRole('button', { name: /Review 3 VMs individually/i }))
    const webCb = screen.getByRole('checkbox', { name: /^web01/ })
    expect(webCb).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(webCb)
    expect(useExclusionsStore.getState().rules.manuallyExcluded).toContain('s1::web01')
    fireEvent.click(webCb)
    expect(useExclusionsStore.getState().rules.manuallyExcluded).not.toContain('s1::web01')
  })

  it('commits exactNames only on blur, preserving newlines mid-edit', () => {
    render(<VmExclusionPanel rows={rows} />)
    const ta = screen.getByLabelText(/Exact names/i) as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: 'lab-a\nlab-b\n' } })
    // Not committed yet — store still has empty exactNames
    expect(useExclusionsStore.getState().rules.exactNames).toEqual([])
    // Newline preserved in local text state
    expect(ta.value).toBe('lab-a\nlab-b\n')
    fireEvent.blur(ta)
    expect(useExclusionsStore.getState().rules.exactNames).toEqual(['lab-a', 'lab-b'])
  })
})
