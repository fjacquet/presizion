import { describe, it, expect } from 'vitest'
import * as XLSX from '@e965/xlsx'
import { parseRvtools } from '../rvtoolsParser'

function buildXlsx(vInfo: Record<string, unknown>[]): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vInfo), 'vInfo')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('parseRvtools — vmRowsByScope', () => {
  it('emits one VmRow per non-template VM with powerState', async () => {
    const buf = buildXlsx([
      { VM: 'web01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'prod-cl', Datacenter: 'dc1', Powerstate: 'poweredOn' },
      { VM: 'tmpl01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: true, Cluster: 'prod-cl', Datacenter: 'dc1', Powerstate: 'poweredOff' },
      { VM: 'db01', CPUs: 8, Memory: 16384, 'Provisioned MB': 204800, Template: false, Cluster: 'prod-cl', Datacenter: 'dc1', Powerstate: 'poweredOff' },
    ])
    const result = await parseRvtools(buf)
    const prod = result.vmRowsByScope!.get('dc1||prod-cl')!
    expect(prod.map((r) => r.name)).toEqual(['web01', 'db01'])
    expect(prod[0]!.powerState).toBe('poweredOn')
    expect(prod[1]!.powerState).toBe('poweredOff')
  })

  it('leaves powerState undefined when Powerstate column is absent', async () => {
    const buf = buildXlsx([
      { VM: 'web01', CPUs: 4, Memory: 8192, 'Provisioned MB': 102400, Template: false, Cluster: 'cl1', Datacenter: 'dc1' },
    ])
    const result = await parseRvtools(buf)
    const row = result.vmRowsByScope!.get('dc1||cl1')![0]!
    expect(row.powerState).toBeUndefined()
  })
})
