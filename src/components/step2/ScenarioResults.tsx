import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { useScenariosResults } from '@/hooks/useScenariosResults';
import {
  cpuFormulaString,
  diskFormulaString,
  ramFormulaString,
  specintFormulaString,
} from '@/lib/sizing/display';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';
import type { LimitingResource } from '@/types/results';
import { SingleVmFitBanner } from './SingleVmFitBanner';

interface ScenarioResultsProps {
  scenarioId: string;
}

export function ScenarioResults({ scenarioId }: ScenarioResultsProps) {
  const { t } = useTranslation('step2');
  const results = useScenariosResults();
  const scenarios = useScenariosStore((s) => s.scenarios);
  const currentCluster = useClusterStore((s) => s.currentCluster);
  const sizingMode = useWizardStore((s) => s.sizingMode);

  const RESOURCE_LABELS: Record<LimitingResource, string> = {
    cpu: t('results.resourceLabels.cpu'),
    ram: t('results.resourceLabels.ram'),
    disk: t('results.resourceLabels.disk'),
    specint: t('results.resourceLabels.specint'),
    ghz: t('results.resourceLabels.ghz'),
  };

  const idx = scenarios.findIndex((s) => s.id === scenarioId);
  const result = idx >= 0 ? results[idx] : undefined;
  const scenario = idx >= 0 ? scenarios[idx] : undefined;

  if (!result || !scenario) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400 py-2">{t('results.noData')}</div>
    );
  }

  const coresPerServer = scenario.socketsPerServer * scenario.coresPerSocket;

  const cpuFormula = cpuFormulaString({
    totalVcpus: currentCluster.totalVcpus,
    safetyPercent: scenario.safetyPercent,
    growthPercent: scenario.growthPercent,
    targetVcpuToPCoreRatio: scenario.targetVcpuToPCoreRatio,
    coresPerServer,
  });

  const effectiveVmCount = currentCluster.totalVms;

  const ramFormula = ramFormulaString({
    totalVms: effectiveVmCount,
    ramPerVmGb: scenario.ramPerVmGb,
    safetyPercent: scenario.safetyPercent,
    growthPercent: scenario.growthPercent,
    ramPerServerGb: scenario.ramPerServerGb,
    ...(currentCluster.ramUtilizationPercent !== undefined && {
      ramUtilizationPercent: currentCluster.ramUtilizationPercent,
    }),
  });

  const diskFormula = diskFormulaString({
    totalVms: effectiveVmCount,
    diskPerVmGb: scenario.diskPerVmGb,
    safetyPercent: scenario.safetyPercent,
    growthPercent: scenario.growthPercent,
    diskPerServerGb: scenario.diskPerServerGb,
  });

  return (
    <div className="mt-4 p-4 bg-slate-100/50 dark:bg-surface-700/50 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tabular-nums">{result.finalCount}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {t('results.serversRequired')}
        </span>
        <Badge variant="secondary">{RESOURCE_LABELS[result.limitingResource]}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <span className="text-slate-500 dark:text-slate-400">
            {result.limitingResource === 'specint'
              ? t('results.specrateLimited')
              : t('results.cpuLimited')}
          </span>
          <span className="font-medium tabular-nums">{result.cpuLimitedCount}</span>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {sizingMode === 'performance' &&
            currentCluster.existingServerCount != null &&
            currentCluster.specintPerServer != null &&
            scenario.targetSpecint != null
              ? specintFormulaString({
                  existingServers: currentCluster.existingServerCount,
                  specintPerServer: currentCluster.specintPerServer,
                  safetyPercent: scenario.safetyPercent,
                  targetSpecint: scenario.targetSpecint,
                })
              : cpuFormula}
          </div>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('results.ramLimited')}</span>
          <span className="font-medium tabular-nums">{result.ramLimitedCount}</span>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {ramFormula}
          </div>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('results.diskLimited')}</span>
          <span className="font-medium tabular-nums">{result.diskLimitedCount}</span>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            {diskFormula}
          </div>
        </div>
      </div>
      <SingleVmFitBanner fit={result.singleVmFit} nameplateRamGb={scenario.ramPerServerGb} />
    </div>
  );
}
