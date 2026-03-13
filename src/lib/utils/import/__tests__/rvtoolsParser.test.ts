import { describe, it } from 'vitest'

describe('rvtoolsParser', () => {
  it.todo('aggregates totalVcpus from num_cpus column')
  it.todo('counts only non-template VMs in vmCount')
  it.todo('computes totalDiskGb as sum of provisioned_mib / 1024')
  it.todo('computes avgRamPerVmGb as sum of memory_mib / vmCount / 1024')
  it.todo('returns zero totalDiskGb when provisioned_mib column is absent')
  it.todo('handles secondary column alias for num_cpus (Num CPUs)')
})
