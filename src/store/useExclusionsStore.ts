import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ExclusionRules } from '@/types/exclusions'
import { EMPTY_RULES } from '@/types/exclusions'

interface ExclusionsState {
  rules: ExclusionRules
  setRules: (partial: Partial<ExclusionRules>) => void
  /** vmKey is `${scopeKey}::${name}` so overrides target one row even with duplicate VM names across scopes. */
  toggleManual: (vmKey: string, kind: 'excluded' | 'included') => void
  reset: () => void
}

export const useExclusionsStore = create<ExclusionsState>()(
  persist(
    (set, get) => ({
      rules: EMPTY_RULES,
      setRules: (partial) => {
        set({ rules: { ...get().rules, ...partial } })
      },
      toggleManual: (vmKey, kind) => {
        const rules = get().rules
        const listKey = kind === 'excluded' ? 'manuallyExcluded' : 'manuallyIncluded'
        const otherKey = kind === 'excluded' ? 'manuallyIncluded' : 'manuallyExcluded'
        const list = rules[listKey]
        const other = rules[otherKey]
        const isOn = list.includes(vmKey)
        set({
          rules: {
            ...rules,
            [listKey]: isOn ? list.filter((k) => k !== vmKey) : [...list, vmKey],
            [otherKey]: other.filter((k) => k !== vmKey),
          },
        })
      },
      reset: () => set({ rules: EMPTY_RULES }),
    }),
    {
      name: 'presizion-exclusions-v1',
      version: 2,
      storage: createJSONStorage(() => globalThis.localStorage),
      migrate: (persistedState, version) => {
        if (version === 2) return persistedState as ExclusionsState
        // v1 → v2: manual lists held bare VM names; we can't retroactively map
        // them to `${scopeKey}::${name}` without the original import context,
        // so drop the manual lists but preserve the rule-based fields.
        if (version === 1 && persistedState != null && typeof persistedState === 'object') {
          const prior = (persistedState as { rules?: Partial<ExclusionRules> }).rules ?? {}
          return {
            rules: {
              ...EMPTY_RULES,
              namePattern: prior.namePattern ?? '',
              exactNames: prior.exactNames ?? [],
              excludePoweredOff: prior.excludePoweredOff ?? false,
            },
          } as ExclusionsState
        }
        return { rules: EMPTY_RULES } as ExclusionsState
      },
    },
  ),
)
