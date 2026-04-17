import { describe, it, expect } from 'vitest'
import { parseLiveoptics } from '../liveopticParser'

function csvBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer
}

describe('parseLiveoptics — vmRowsByScope', () => {
  it('emits one VmRow per non-template VM, scoped by datacenter||cluster', async () => {
    const csv = [
      'VM Name,Virtual CPU,Provisioned Memory (MiB),Virtual Disk Size (MiB),Template,Cluster,Datacenter,Power State',
      'web01,4,8192,102400,false,prod-cl,dc1,poweredOn',
      'tmpl01,4,8192,102400,true,prod-cl,dc1,poweredOff',
      'db01,8,16384,204800,false,prod-cl,dc1,poweredOff',
      'lab01,2,4096,51200,false,lab-cl,dc1,poweredOn',
    ].join('\n')
    const result = await parseLiveoptics(csvBuffer(csv), 'liveoptics-csv')
    expect(result.vmRowsByScope).toBeDefined()
    const prod = result.vmRowsByScope!.get('dc1||prod-cl')
    expect(prod).toBeDefined()
    expect(prod!.map((r) => r.name)).toEqual(['web01', 'db01'])
    expect(prod![0]).toMatchObject({
      name: 'web01', vcpus: 4, ramMib: 8192, diskMib: 102400, powerState: 'poweredOn',
    })
    expect(prod![1]!.powerState).toBe('poweredOff')
    const lab = result.vmRowsByScope!.get('dc1||lab-cl')
    expect(lab!.map((r) => r.name)).toEqual(['lab01'])
  })

  it('leaves powerState undefined when the column is missing', async () => {
    const csv = [
      'VM Name,Virtual CPU,Provisioned Memory (MiB),Virtual Disk Size (MiB),Template,Cluster,Datacenter',
      'web01,4,8192,102400,false,cl1,dc1',
    ].join('\n')
    const result = await parseLiveoptics(csvBuffer(csv), 'liveoptics-csv')
    const row = result.vmRowsByScope!.get('dc1||cl1')![0]!
    expect(row.powerState).toBeUndefined()
  })
})
