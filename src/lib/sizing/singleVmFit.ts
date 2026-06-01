// All RAM values (largestVmRamGb, ramPerServerGb, usableRamGb) are compared as GiB.
import type { OldCluster, Scenario } from '../../types/cluster';
import { computeVsanEffectiveRamPerNode } from './vsanFormulas';

export type FitVerdict = 'ok' | 'warn' | 'fail' | 'unknown';

export interface SingleVmFit {
  vcpu: FitVerdict;
  ram: FitVerdict;
  /** Worst of vcpu/ram; an `unknown` dimension is ignored unless both are unknown. */
  overall: FitVerdict;
  largestVmVcpus?: number; // echoed for UI copy
  largestVmRamGb?: number;
  coresPerServer: number; // sockets x cores/socket
  logicalCpus: number; // coresPerServer x SMT_THREADS_PER_CORE
  usableRamGb: number; // vSAN-aware
}

/** x86 standard 2 threads/core. YAGNI to make configurable now. */
export const SMT_THREADS_PER_CORE = 2;

const RANK: Record<FitVerdict, number> = { unknown: -1, ok: 0, warn: 1, fail: 2 };

function assessVcpu(largest: number | undefined, cores: number, logical: number): FitVerdict {
  if (largest === undefined) return 'unknown';
  if (largest <= cores) return 'ok';
  if (largest <= logical) return 'warn';
  return 'fail';
}

function assessRam(largest: number | undefined, usable: number, nameplate: number): FitVerdict {
  if (largest === undefined) return 'unknown';
  if (largest <= usable) return 'ok';
  if (largest <= nameplate) return 'warn';
  return 'fail';
}

function worstVerdict(a: FitVerdict, b: FitVerdict): FitVerdict {
  const known = [a, b].filter((v): v is Exclude<FitVerdict, 'unknown'> => v !== 'unknown');
  if (known.length === 0) return 'unknown';
  return known.reduce((worst, v) => (RANK[v] > RANK[worst] ? v : worst));
}

/**
 * Non-blocking single-VM fit check: can the cluster's largest VM (by vCPU and by
 * RAM, independently) fit on ONE proposed target host? Pure; never divides -- only
 * compares -- so degenerate host configs (cores=0/RAM=0) compare cleanly.
 */
export function assessSingleVmFit(cluster: OldCluster, scenario: Scenario): SingleVmFit {
  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;
  const logicalCpus = coresPerServer * SMT_THREADS_PER_CORE;
  const vsanApplies = scenario.vsanFttPolicy !== undefined;
  const usableRamGb = vsanApplies
    ? computeVsanEffectiveRamPerNode(scenario.ramPerServerGb, scenario.vsanMemoryPerHostGb)
    : scenario.ramPerServerGb;

  const vcpu = assessVcpu(cluster.largestVmVcpus, coresPerServer, logicalCpus);
  const ram = assessRam(cluster.largestVmRamGb, usableRamGb, scenario.ramPerServerGb);

  return {
    vcpu,
    ram,
    overall: worstVerdict(vcpu, ram),
    ...(cluster.largestVmVcpus !== undefined && { largestVmVcpus: cluster.largestVmVcpus }),
    ...(cluster.largestVmRamGb !== undefined && { largestVmRamGb: cluster.largestVmRamGb }),
    coresPerServer,
    logicalCpus,
    usableRamGb,
  };
}
