import { ImportError } from './fileValidation'

export type ColumnAliasMap = Record<string, string[]>

export const RVTOOLS_ALIASES: ColumnAliasMap = {
  vm_name: ['VM', 'VM Name'],
  num_cpus: ['CPUs', 'Num CPUs', 'vCPUs'],
  memory_mib: ['Memory', 'Memory MB', 'Memory MiB'],
  provisioned_mib: ['Provisioned MB', 'Provisioned MiB'],
  is_template: ['Template'],
}

export const LIVEOPTICS_ALIASES: ColumnAliasMap = {
  vm_name: ['VM Name'],
  num_cpus: ['Virtual CPU', 'vCPU', 'CPUs'],
  memory_mib: ['Provisioned Memory (MiB)', 'Memory (MiB)', 'Memory MB'],
  provisioned_mib: ['Virtual Disk Size (MiB)'],
  is_template: ['Template'],
  power_state: ['Power State', 'Power', 'PowerState'],
}

export const RVTOOLS_VHOST_ALIASES: ColumnAliasMap = {
  host_name:    ['Host', 'Name', 'Host Name'],
  cpu_model:    ['CPU Model'],
  cpu_speed_mhz: ['Speed MHz', 'CPU Speed MHz', 'CPU Speed'],
  cpu_sockets:  ['# CPU', 'CPUs', 'Num CPU', 'Sockets'],
  cpu_cores_total: ['# Cores', 'CPU Cores', 'Cores'],
  memory_mb:    ['Memory Size', 'Memory MB', 'Memory'],
}

export const LIVEOPTICS_ESX_HOSTS_ALIASES: ColumnAliasMap = {
  host_name:    ['Host Name', 'ESX Host', 'Host'],
  cpu_sockets:  ['CPU Sockets', 'Sockets'],
  cpu_cores:    ['CPU Cores', 'Cores'],
  memory_kib:   ['Memory (KiB)', 'Memory KiB', 'Memory'],
  cpu_model:    ['CPU Model', 'Processor Model', 'Processor', 'CPU Description'],
  cpu_speed_mhz: ['CPU Speed (MHz)', 'CPU Speed', 'CPU MHz'],
  cpu_speed_ghz: ['CPU Clock Speed (GHz)', 'Net Clock Speed (GHz)'],
  cluster_name: ['Cluster', 'cluster', 'Cluster Name'],
}

export const LIVEOPTICS_ESX_PERF_ALIASES: ColumnAliasMap = {
  host_name:   ['Host Name', 'ESX Host', 'Host'],
  avg_cpu_pct: ['Average CPU %', 'Avg CPU %', 'CPU %'],
  avg_mem_pct: ['Average Memory %', 'Avg Memory %', 'Memory %'],
}

export const CLUSTER_ALIASES: ColumnAliasMap = {
  cluster_name: ['Cluster', 'cluster', 'ClusterName', 'cluster_name', 'Cluster Name'],
}

export const DATACENTER_ALIASES: ColumnAliasMap = {
  datacenter_name: ['Datacenter', 'datacenter', 'DC', 'DataCenter', 'data_center'],
}

/**
 * Resolves header names in a spreadsheet to canonical field names.
 * Trims whitespace from headers (common in exported files).
 * Returns a map of canonical → actual header name, or undefined if absent.
 * Throws ImportError listing any required columns that could not be resolved.
 */
export function resolveColumns(
  headers: string[],
  aliases: ColumnAliasMap,
  required: Set<string>,
): Record<string, string | undefined> {
  const trimmed = headers.map((h) => h.trim())
  const result: Record<string, string | undefined> = {}
  const missing: string[] = []

  for (const [canonical, candidates] of Object.entries(aliases)) {
    const matched = candidates.find((alias) => trimmed.includes(alias))
    result[canonical] = matched
    if (!matched && required.has(canonical)) {
      missing.push(`${canonical} (tried: ${candidates.join(', ')})`)
    }
  }

  if (missing.length > 0) {
    throw new ImportError(`Missing required columns: ${missing.join('; ')}`)
  }

  return result
}
