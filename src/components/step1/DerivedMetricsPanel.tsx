import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScenariosResults } from '@/hooks/useScenariosResults';
import { deriveClusterMetrics } from '@/lib/sizing/derivedMetrics';
import { useClusterStore } from '@/store/useClusterStore';

interface MetricItemProps {
  label: string;
  value: string | number;
  unit?: string;
}

function MetricItem({ label, value, unit }: MetricItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span className="status-dot" aria-hidden="true" />
        {label}
      </span>
      <span className="data-readout text-lg font-semibold text-slate-900 dark:text-slate-100">
        {value}
        {unit ? (
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function DerivedMetricsPanel() {
  const { t } = useTranslation('step1');
  const cluster = useClusterStore((s) => s.currentCluster);
  const results = useScenariosResults();

  const derived = deriveClusterMetrics(cluster);
  const firstResult = results[0];

  const vcpuToPcoreRatio =
    derived.vcpuToPcoreRatio != null ? derived.vcpuToPcoreRatio.toFixed(2) : '—';
  const vmsPerServer = firstResult ? firstResult.vmsPerServer.toFixed(1) : '—';
  const avgVcpuPerVm = derived.avgVcpuPerVm != null ? derived.avgVcpuPerVm.toFixed(1) : '—';
  const avgRamPerVm = cluster.avgRamPerVmGb != null ? cluster.avgRamPerVmGb.toFixed(1) : '—';
  const avgDiskPerVm = derived.avgDiskPerVmGb != null ? derived.avgDiskPerVmGb.toFixed(1) : '—';

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="cockpit-eyebrow">{t('derivedMetrics.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <MetricItem label={t('derivedMetrics.vcpuRatio')} value={vcpuToPcoreRatio} />
          <MetricItem label={t('derivedMetrics.vmsPerServer')} value={vmsPerServer} />
          <MetricItem label={t('derivedMetrics.avgVcpuPerVm')} value={avgVcpuPerVm} />
          <MetricItem label={t('derivedMetrics.avgRamPerVm')} value={avgRamPerVm} unit="GiB" />
          <MetricItem label={t('derivedMetrics.avgDiskPerVm')} value={avgDiskPerVm} unit="GiB" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
          {t('derivedMetrics.footnote')}
        </p>
      </CardContent>
    </Card>
  );
}
