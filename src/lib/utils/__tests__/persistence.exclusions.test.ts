import { describe, it, expect } from 'vitest'
import { buildJsonContent } from '../export'
import { parsePresizionJson } from '../import/jsonParser'
import { encodeSessionToHash, decodeSessionFromHash } from '../persistence'
import type { SessionData } from '../persistence'
import type { OldCluster, Scenario } from '@/types/cluster'
import type { ScenarioResult } from '@/types/results'
import { EMPTY_RULES } from '@/types/exclusions'

const cluster: OldCluster = { totalVcpus: 100, totalPcores: 50, totalVms: 20 }
const scenarios: Scenario[] = []
const results: ScenarioResult[] = []

function toBuffer(s: string): ArrayBuffer {
  return new TextEncoder().encode(s).buffer as ArrayBuffer
}

describe('JSON schema v2 exclusions round-trip', () => {
  it('emits schemaVersion 2 with exclusions block when rules non-empty', () => {
    const rules = { ...EMPTY_RULES, namePattern: 'test-*', excludePoweredOff: true }
    const json = buildJsonContent(cluster, scenarios, results, rules)
    const parsed = JSON.parse(json)
    expect(parsed.schemaVersion).toBe('2')
    expect(parsed.exclusions).toEqual(rules)
  })

  it('omits exclusions block when rules are EMPTY_RULES', () => {
    const json = buildJsonContent(cluster, scenarios, results, EMPTY_RULES)
    expect(JSON.parse(json).exclusions).toBeUndefined()
  })

  it('reads exclusions back from a v2 export', () => {
    const rules = { ...EMPTY_RULES, exactNames: ['lab-a', 'lab-b'] }
    const json = buildJsonContent(cluster, scenarios, results, rules)
    const result = parsePresizionJson(toBuffer(json))
    expect(result.exclusions).toEqual(rules)
  })

  it('v1 files parse with exclusions undefined (no error)', () => {
    const v1 = JSON.stringify({
      schemaVersion: '1.1',
      currentCluster: { totalVcpus: 10, totalPcores: 5, totalVms: 2 },
      scenarios: [],
    })
    const result = parsePresizionJson(toBuffer(v1))
    expect(result.exclusions).toBeUndefined()
  })
})

const baseSession: SessionData = {
  cluster: { totalVcpus: 100, totalPcores: 50, totalVms: 20 },
  scenarios: [],
  sizingMode: 'vcpu',
  layoutMode: 'hci',
}

describe('URL hash v2 — exclusions', () => {
  it('round-trips empty exclusions', () => {
    const hash = encodeSessionToHash({ ...baseSession, exclusions: EMPTY_RULES })
    const decoded = decodeSessionFromHash(hash)!
    expect(decoded.exclusions).toEqual(EMPTY_RULES)
  })

  it('round-trips populated exclusions', () => {
    const rules = { ...EMPTY_RULES, namePattern: 'test-*', excludePoweredOff: true }
    const hash = encodeSessionToHash({ ...baseSession, exclusions: rules })
    expect(decodeSessionFromHash(hash)!.exclusions).toEqual(rules)
  })

  it('drops manuallyExcluded first when over 8 KB', () => {
    const huge = Array.from({ length: 5000 }, (_, i) => `vm-${i}`)
    const rules = { ...EMPTY_RULES, manuallyExcluded: huge, exactNames: ['keep'] }
    const hash = encodeSessionToHash({ ...baseSession, exclusions: rules })
    expect(hash.length).toBeLessThanOrEqual(8192)
    const decoded = decodeSessionFromHash(hash)!
    expect(decoded.exclusions!.manuallyExcluded).toEqual([])
    expect(decoded.exclusions!.exactNames).toEqual(['keep'])
    expect(decoded.truncated).toBe(true)
  })

  it('drops exactNames next when still over 8 KB without manuallyExcluded', () => {
    const huge = Array.from({ length: 5000 }, (_, i) => `lab-${i}`)
    const rules = { ...EMPTY_RULES, exactNames: huge, namePattern: 'test-*' }
    const hash = encodeSessionToHash({ ...baseSession, exclusions: rules })
    const decoded = decodeSessionFromHash(hash)!
    expect(decoded.exclusions!.namePattern).toBe('test-*')
    expect(decoded.exclusions!.exactNames).toEqual([])
  })

  it('does not mark truncated when payload fits under the ceiling', () => {
    const hash = encodeSessionToHash({
      ...baseSession,
      exclusions: { ...EMPTY_RULES, namePattern: 'small' },
    })
    const decoded = decodeSessionFromHash(hash)!
    expect(decoded.truncated).toBeUndefined()
  })
})
