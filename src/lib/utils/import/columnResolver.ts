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

export function resolveColumns(
  _headers: string[],
  _aliases: ColumnAliasMap,
  _required: Set<string>,
): Record<string, string | undefined> {
  throw new Error('not implemented')
}
