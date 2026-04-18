import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ExclusionRules } from '@/types/exclusions'
import { EMPTY_RULES } from '@/types/exclusions'

interface ExclusionsState {
  rules: ExclusionRules
  setRules: (partial: Partial<ExclusionRules>) => void
  toggleManual: (vmName: string, kind: 'excluded' | 'included') => void
  reset: () => void
}

export const useExclusionsStore = create<ExclusionsState>()(
  persist(
    (set, get) => ({
      rules: EMPTY_RULES,
      setRules: (partial) => {
        set({ rules: { ...get().rules, ...partial } })
      },
      toggleManual: (vmName, kind) => {
        const rules = get().rules
        const listKey = kind === 'excluded' ? 'manuallyExcluded' : 'manuallyIncluded'
        const otherKey = kind === 'excluded' ? 'manuallyIncluded' : 'manuallyExcluded'
        const list = rules[listKey]
        const other = rules[otherKey]
        const isOn = list.includes(vmName)
        set({
          rules: {
            ...rules,
            [listKey]: isOn ? list.filter((n) => n !== vmName) : [...list, vmName],
            [otherKey]: other.filter((n) => n !== vmName),
          },
        })
      },
      reset: () => set({ rules: EMPTY_RULES }),
    }),
    {
      name: 'presizion-exclusions-v1',
      version: 1,
      storage: createJSONStorage(() => globalThis.localStorage),
      migrate: (persistedState, version) => {
        if (version !== 1) return { rules: EMPTY_RULES }
        return persistedState as ExclusionsState
      },
    },
  ),
)
