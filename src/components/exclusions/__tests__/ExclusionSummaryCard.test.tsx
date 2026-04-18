import { render, screen } from '@testing-library/react'
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

import { ExclusionSummaryCard } from '../ExclusionSummaryCard'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import { useImportStore } from '@/store/useImportStore'

describe('ExclusionSummaryCard', () => {
  beforeEach(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
    vi.stubGlobal('localStorage', localStorageMock)
    useExclusionsStore.getState().reset()
    useImportStore.getState().clearImport()
  })

  it('renders nothing when no rules and no session rows', () => {
    const { container } = render(<ExclusionSummaryCard />)
    expect(container.firstChild).toBeNull()
  })

  it('shows read-only badges when rules exist but no vmRowsByScope this session', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*' })
    render(<ExclusionSummaryCard />)
    expect(screen.getByText(/Pattern/i)).toBeInTheDocument()
    expect(screen.getByText(/Re-import.*to edit/i)).toBeInTheDocument()
  })

  it('shows Edit button when vmRowsByScope is present', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*' })
    useImportStore.setState({
      rawByScope: new Map(),
      vmRowsByScope: new Map([['__all__', [{ name: 'a', scopeKey: '__all__', vcpus: 1, ramMib: 1024, diskMib: 1024 }]]]),
      activeScope: ['__all__'],
    })
    render(<ExclusionSummaryCard />)
    expect(screen.getByRole('button', { name: /Edit exclusions/i })).toBeInTheDocument()
  })
})
