/**
 * ComparisonTable — Unit tests
 * Requirements: COMP-01, COMP-02, UX-04
 *
 * Wave 0 stubs — implementations filled in by plan 03-02.
 */
import { describe, it } from 'vitest'

describe('ComparisonTable', () => {
  describe('COMP-01: side-by-side comparison display', () => {
    it.todo('renders a table with one column per scenario')
    it.todo('renders metric labels as row headers: server count, limiting resource, vCPU:pCore ratio, VMs/server, headroom %, CPU util, RAM util, disk util')
    it.todo('renders scenario names as column headers')
  })

  describe('COMP-02: correct values in table cells', () => {
    it.todo('displays final server count for each scenario')
    it.todo('displays limiting resource label (cpu, ram, or disk) for each scenario')
    it.todo('displays achieved vCPU:pCore ratio for each scenario')
    it.todo('displays VMs per server for each scenario')
    it.todo('displays headroom percent for each scenario')
    it.todo('displays CPU, RAM, and disk utilization percentages for each scenario')
  })

  describe('UX-04: color-coded utilization indicators', () => {
    it.todo('applies green class when utilization < 70%')
    it.todo('applies amber class when utilization >= 70% and < 90%')
    it.todo('applies red class when utilization >= 90%')
    it.todo('highlights the limiting resource cell for each scenario')
  })
})
