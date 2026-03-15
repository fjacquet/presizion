/**
 * Unit tests for useScenariosStore.seedFromCluster — scenario seeding from import (AVG-04)
 * Requirements: AVG-04 (imported avg values seed scenario defaults)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useScenariosStore } from '../useScenariosStore'
import { createDefaultScenario } from '../../lib/sizing/defaults'
import type { OldCluster } from '../../types/cluster'

beforeEach(() => {
  useScenariosStore.setState({ scenarios: [createDefaultScenario(), createDefaultScenario()] })
})

describe('useScenariosStore.seedFromCluster', () => {
  it('Test 1: sets all scenarios ramPerVmGb when avgRamPerVmGb is provided', () => {
    const cluster: OldCluster = {
      totalVcpus: 400,
      totalPcores: 100,
      totalVms: 50,
      avgRamPerVmGb: 12,
    }

    useScenariosStore.getState().seedFromCluster(cluster)

    const scenarios = useScenariosStore.getState().scenarios
    expect(scenarios).toHaveLength(2)
    scenarios.forEach((s) => {
      expect(s.ramPerVmGb).toBe(12)
    })
  })

  it('Test 2: sets all scenarios diskPerVmGb when totalDiskGb and totalVms provided', () => {
    const cluster: OldCluster = {
      totalVcpus: 400,
      totalPcores: 100,
      totalVms: 100,
      totalDiskGb: 5000,
    }

    useScenariosStore.getState().seedFromCluster(cluster)

    const scenarios = useScenariosStore.getState().scenarios
    scenarios.forEach((s) => {
      expect(s.diskPerVmGb).toBe(50)
    })
  })

  it('Test 3: does NOT overwrite existing ramPerVmGb when avgRamPerVmGb is undefined', () => {
    // Set known ramPerVmGb values first
    const initialScenarios = useScenariosStore.getState().scenarios.map((s) => ({
      ...s,
      ramPerVmGb: 8,
    }))
    useScenariosStore.setState({ scenarios: initialScenarios })

    const cluster: OldCluster = {
      totalVcpus: 400,
      totalPcores: 100,
      totalVms: 50,
      // avgRamPerVmGb intentionally omitted
    }

    useScenariosStore.getState().seedFromCluster(cluster)

    const scenarios = useScenariosStore.getState().scenarios
    scenarios.forEach((s) => {
      expect(s.ramPerVmGb).toBe(8) // unchanged
    })
  })

  it('Test 4: addScenario with overrides seeds ramPerVmGb and diskPerVmGb from import data', () => {
    // Simulate the logic from Step2Scenarios.tsx (line 29-36)
    const currentCluster: OldCluster = {
      totalVcpus: 400,
      totalPcores: 100,
      totalVms: 100,
      totalDiskGb: 5000,
      avgRamPerVmGb: 16,
    }

    const ramPerVmGb = currentCluster.avgRamPerVmGb
    const diskPerVmGb =
      currentCluster.totalDiskGb && currentCluster.totalVms
        ? Math.round((currentCluster.totalDiskGb / currentCluster.totalVms) * 10) / 10
        : undefined

    useScenariosStore.getState().addScenario({
      ...(ramPerVmGb != null && { ramPerVmGb }),
      ...(diskPerVmGb != null && { diskPerVmGb }),
    })

    const scenarios = useScenariosStore.getState().scenarios
    const newScenario = scenarios[scenarios.length - 1]
    expect(newScenario.ramPerVmGb).toBe(16)
    expect(newScenario.diskPerVmGb).toBe(50)
  })
})
