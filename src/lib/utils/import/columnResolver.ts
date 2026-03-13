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
