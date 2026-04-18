import type { PowerState } from '@/types/exclusions'

export type ParsedRow = Record<string, unknown>

export function parsePowerState(raw: string): PowerState | undefined {
  const s = raw.toLowerCase().replace(/\s+/g, '')
  if (s === 'poweredon' || s === 'on') return 'poweredOn'
  if (s === 'poweredoff' || s === 'off') return 'poweredOff'
  if (s === 'suspended') return 'suspended'
  if (s === '') return undefined
  return 'unknown'
}

export function num(row: ParsedRow, col: string | undefined): number {
  if (!col) return 0
  const v = row[col]
  return typeof v === 'number' ? v : parseFloat(String(v ?? '0')) || 0
}

export function isTruthy(row: ParsedRow, col: string | undefined): boolean {
  if (!col) return false
  const v = row[col]
  return v === true || v === 'TRUE' || v === 'true' || v === 1
}

export function str(row: ParsedRow, col: string | undefined): string {
  if (!col) return ''
  const v = row[col]
  return v == null ? '' : String(v).trim()
}

export function buildScopeLabel(scopeKey: string): string {
  if (scopeKey === '__all__') return 'All'
  if (scopeKey.includes('||')) {
    const [dc, cluster] = scopeKey.split('||')
    if (cluster === '__standalone__') return `Standalone (${dc})`
    return `${cluster} (${dc})`
  }
  return scopeKey
}

export function appendToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  map.set(key, [...(map.get(key) ?? []), value])
}
