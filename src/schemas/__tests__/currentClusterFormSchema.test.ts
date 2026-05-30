import { currentClusterFormSchema } from '../currentClusterFormSchema'

it('rejects missing utilization', () => {
  const r = currentClusterFormSchema.safeParse({ totalVcpus: 1, totalPcores: 1, totalVms: 1 })
  expect(r.success).toBe(false)
})
it('accepts when utilization provided', () => {
  const r = currentClusterFormSchema.safeParse({
    totalVcpus: 1, totalPcores: 1, totalVms: 1,
    cpuUtilizationPercent: 55, ramUtilizationPercent: 60,
  })
  expect(r.success).toBe(true)
})
