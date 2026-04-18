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

import { useExclusionsStore } from '../useExclusionsStore'
import { EMPTY_RULES } from '@/types/exclusions'

const STORAGE_KEY = 'presizion-exclusions-v1'

describe('useExclusionsStore', () => {
  beforeEach(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
    vi.stubGlobal('localStorage', localStorageMock)
    useExclusionsStore.getState().reset()
  })

  it('starts with EMPTY_RULES', () => {
    expect(useExclusionsStore.getState().rules).toEqual(EMPTY_RULES)
  })

  it('setRules partially merges', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*' })
    expect(useExclusionsStore.getState().rules.namePattern).toBe('test-*')
    expect(useExclusionsStore.getState().rules.excludePoweredOff).toBe(false)
  })

  it('toggleManual adds a composite key to manuallyExcluded and removes from manuallyIncluded', () => {
    useExclusionsStore.getState().setRules({ manuallyIncluded: ['s1::vm-a'] })
    useExclusionsStore.getState().toggleManual('s1::vm-a', 'excluded')
    const rules = useExclusionsStore.getState().rules
    expect(rules.manuallyExcluded).toContain('s1::vm-a')
    expect(rules.manuallyIncluded).not.toContain('s1::vm-a')
  })

  it('toggleManual removes the entry when it already matches the target state', () => {
    useExclusionsStore.getState().setRules({ manuallyExcluded: ['s1::vm-a'] })
    useExclusionsStore.getState().toggleManual('s1::vm-a', 'excluded')
    expect(useExclusionsStore.getState().rules.manuallyExcluded).not.toContain('s1::vm-a')
  })

  it('toggleManual scopes are independent across scopeKey prefixes', () => {
    useExclusionsStore.getState().toggleManual('dcA::dup', 'excluded')
    useExclusionsStore.getState().toggleManual('dcB::dup', 'excluded')
    const rules = useExclusionsStore.getState().rules
    expect(rules.manuallyExcluded).toContain('dcA::dup')
    expect(rules.manuallyExcluded).toContain('dcB::dup')
    useExclusionsStore.getState().toggleManual('dcA::dup', 'excluded')
    expect(useExclusionsStore.getState().rules.manuallyExcluded).toEqual(['dcB::dup'])
  })

  it('reset restores EMPTY_RULES', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*', manuallyExcluded: ['s1::x'] })
    useExclusionsStore.getState().reset()
    expect(useExclusionsStore.getState().rules).toEqual(EMPTY_RULES)
  })

  it('persists to localStorage under presizion-exclusions-v1', () => {
    useExclusionsStore.getState().setRules({ namePattern: 'test-*' })
    const raw = localStorageStore[STORAGE_KEY]
    expect(raw).toBeDefined()
    expect(JSON.parse(raw!).state.rules.namePattern).toBe('test-*')
  })
})
