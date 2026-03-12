// VALIDATION.md: CALC-04 (N+1 HA), CALC-05 (max constraint + limiting resource), CALC-06 (utilization metrics)
// Imported function will come from src/lib/sizing/constraints.ts (Plan 02)
import { describe, it } from 'vitest';

// CPU-limited full scenario fixture (reused across CALC-04/05/06 tests)
// OldCluster: totalVcpus=3200, totalVms=100, totalPcores=800
// Scenario: sockets=2, coresPerSocket=20 (40 pCores/server), ram=1024GB/server, disk=50000GB/server
//           ratio=4, ramPerVm=2GB, diskPerVm=10GB, headroom=20%, haReserve=false
// Expected: cpuCount=24, ramCount=1, diskCount=1, finalCount=24, limiting='cpu'
// Utilization: achieved ratio = 3200/(24*40)=3.33, vmsPerServer=100/24=4.17
const CPU_LIMITED_CLUSTER = { totalVcpus: 3200, totalVms: 100, totalPcores: 800 };
const CPU_LIMITED_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'CPU-Limited',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 1024, diskPerServerGb: 50000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 10,
  headroomPercent: 20, haReserveEnabled: false,
};

// RAM-limited scenario fixture
// OldCluster: totalVcpus=400, totalVms=500, totalPcores=200
// Scenario: sockets=2, coresPerSocket=20, ram=512GB/server, disk=50000GB/server
//           ratio=4, ramPerVm=16GB, diskPerVm=10GB, headroom=20%, haReserve=false
// cpuCount=ceil(400*1.20/4/40)=ceil(3)=3, ramCount=ceil(500*16*1.20/512)=ceil(18.75)=19
// diskCount=ceil(500*10*1.20/50000)=ceil(0.12)=1 → final=19, limiting='ram'
const RAM_LIMITED_CLUSTER = { totalVcpus: 400, totalVms: 500, totalPcores: 200 };
const RAM_LIMITED_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000002',
  name: 'RAM-Limited',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 512, diskPerServerGb: 50000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 16, diskPerVmGb: 10,
  headroomPercent: 20, haReserveEnabled: false,
};

// Disk-limited scenario fixture
// OldCluster: totalVcpus=200, totalVms=200, totalPcores=100
// Scenario: sockets=2, coresPerSocket=20, ram=1024GB/server, disk=10000GB/server
//           ratio=4, ramPerVm=2GB, diskPerVm=500GB, headroom=20%, haReserve=false
// cpuCount=ceil(200*1.20/4/40)=ceil(1.5)=2, ramCount=ceil(200*2*1.20/1024)=ceil(0.47)=1
// diskCount=ceil(200*500*1.20/10000)=ceil(12)=12 → final=12, limiting='disk'
const DISK_LIMITED_CLUSTER = { totalVcpus: 200, totalVms: 200, totalPcores: 100 };
const DISK_LIMITED_SCENARIO = {
  id: '00000000-0000-0000-0000-000000000003',
  name: 'Disk-Limited',
  socketsPerServer: 2, coresPerSocket: 20,
  ramPerServerGb: 1024, diskPerServerGb: 10000,
  targetVcpuToPCoreRatio: 4, ramPerVmGb: 2, diskPerVmGb: 500,
  headroomPercent: 20, haReserveEnabled: false,
};

describe('computeScenarioResult', () => {
  describe('CALC-05: constraint selection and limiting resource', () => {
    it.todo('CPU-limited: finalCount=24, limitingResource=cpu');
    it.todo('RAM-limited: finalCount=19, limitingResource=ram');
    it.todo('disk-limited: finalCount=12, limitingResource=disk');
  });

  describe('CALC-04: N+1 HA reserve', () => {
    it.todo('haReserveEnabled=false: finalCount equals rawCount');
    it.todo('haReserveEnabled=true: finalCount equals rawCount + 1');
    it.todo('HA adds exactly 1 (not a percentage) to final count');
  });

  describe('CALC-06: utilization metrics', () => {
    it.todo('achievedVcpuToPCoreRatio is correct for CPU-limited fixture');
    it.todo('vmsPerServer is correct for CPU-limited fixture');
    it.todo('cpuUtilizationPercent is in range 0–100');
    it.todo('ramUtilizationPercent is in range 0–100');
    it.todo('diskUtilizationPercent is in range 0–100');
  });
});

export { CPU_LIMITED_CLUSTER, CPU_LIMITED_SCENARIO, RAM_LIMITED_CLUSTER, RAM_LIMITED_SCENARIO, DISK_LIMITED_CLUSTER, DISK_LIMITED_SCENARIO };
