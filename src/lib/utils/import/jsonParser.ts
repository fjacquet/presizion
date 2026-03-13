import type { OldCluster, Scenario } from '@/types/cluster'
import { ImportError } from './fileValidation'

export interface JsonImportResult {
  sourceFormat: 'presizion-json'
  cluster: OldCluster
  scenarios: Scenario[]
}

export function parsePresizionJson(buffer: ArrayBuffer): JsonImportResult {
  const text = new TextDecoder().decode(buffer)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new ImportError('Invalid JSON file.')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('schemaVersion' in parsed) ||
    !('currentCluster' in parsed) ||
    !('scenarios' in parsed)
  ) {
    throw new ImportError('JSON file is not a Presizion export (missing schemaVersion, currentCluster, or scenarios).')
  }

  const { currentCluster, scenarios } = parsed as Record<string, unknown>

  if (typeof currentCluster !== 'object' || currentCluster === null) {
    throw new ImportError('JSON export has invalid currentCluster field.')
  }

  const c = currentCluster as Record<string, unknown>
  const cluster: OldCluster = {
    totalVcpus: num(c.totalVcpus, 'totalVcpus'),
    totalPcores: num(c.totalPcores, 'totalPcores'),
    totalVms: num(c.totalVms, 'totalVms'),
    ...(c.totalDiskGb != null && { totalDiskGb: num(c.totalDiskGb, 'totalDiskGb') }),
    ...(c.socketsPerServer != null && { socketsPerServer: num(c.socketsPerServer, 'socketsPerServer') }),
    ...(c.coresPerSocket != null && { coresPerSocket: num(c.coresPerSocket, 'coresPerSocket') }),
    ...(c.ramPerServerGb != null && { ramPerServerGb: num(c.ramPerServerGb, 'ramPerServerGb') }),
    ...(c.existingServerCount != null && { existingServerCount: num(c.existingServerCount, 'existingServerCount') }),
    ...(c.specintPerServer != null && { specintPerServer: num(c.specintPerServer, 'specintPerServer') }),
    ...(c.cpuUtilizationPercent != null && { cpuUtilizationPercent: num(c.cpuUtilizationPercent, 'cpuUtilizationPercent') }),
    ...(c.ramUtilizationPercent != null && { ramUtilizationPercent: num(c.ramUtilizationPercent, 'ramUtilizationPercent') }),
  }

  if (!Array.isArray(scenarios)) {
    throw new ImportError('JSON export has invalid scenarios field.')
  }

  const parsedScenarios: Scenario[] = scenarios.map((s: unknown, i: number) => {
    if (typeof s !== 'object' || s === null) throw new ImportError(`Scenario ${i} is not an object.`)
    const sc = s as Record<string, unknown>
    return {
      id: typeof sc.id === 'string' ? sc.id : crypto.randomUUID(),
      name: typeof sc.name === 'string' ? sc.name : `Scenario ${i + 1}`,
      socketsPerServer: num(sc.socketsPerServer, `scenarios[${i}].socketsPerServer`),
      coresPerSocket: num(sc.coresPerSocket, `scenarios[${i}].coresPerSocket`),
      ramPerServerGb: num(sc.ramPerServerGb, `scenarios[${i}].ramPerServerGb`),
      diskPerServerGb: num(sc.diskPerServerGb, `scenarios[${i}].diskPerServerGb`),
      targetVcpuToPCoreRatio: num(sc.targetVcpuToPCoreRatio, `scenarios[${i}].targetVcpuToPCoreRatio`),
      ramPerVmGb: num(sc.ramPerVmGb, `scenarios[${i}].ramPerVmGb`),
      diskPerVmGb: num(sc.diskPerVmGb, `scenarios[${i}].diskPerVmGb`),
      headroomPercent: num(sc.headroomPercent, `scenarios[${i}].headroomPercent`),
      haReserveEnabled: typeof sc.haReserveEnabled === 'boolean' ? sc.haReserveEnabled : false,
      ...(sc.targetSpecint != null && { targetSpecint: num(sc.targetSpecint, `scenarios[${i}].targetSpecint`) }),
    }
  })

  return { sourceFormat: 'presizion-json', cluster, scenarios: parsedScenarios }
}

function num(v: unknown, field: string): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) throw new ImportError(`JSON field "${field}" is not a valid number.`)
  return n
}
