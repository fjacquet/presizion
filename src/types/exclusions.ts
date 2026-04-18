export interface ExclusionRules {
  readonly namePattern: string
  readonly exactNames: readonly string[]
  readonly excludePoweredOff: boolean
  readonly manuallyExcluded: readonly string[]
  readonly manuallyIncluded: readonly string[]
}

export const EMPTY_RULES: ExclusionRules = {
  namePattern: '',
  exactNames: [],
  excludePoweredOff: false,
  manuallyExcluded: [],
  manuallyIncluded: [],
}

export type PowerState = 'poweredOn' | 'poweredOff' | 'suspended' | 'unknown'
