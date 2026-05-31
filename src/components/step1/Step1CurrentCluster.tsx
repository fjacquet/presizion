import { useTranslation } from 'react-i18next';
import { ExclusionSummaryCard } from '@/components/exclusions/ExclusionSummaryCard';
import { useRecomputeCluster } from '@/hooks/useRecomputeCluster';
import { useWizardStore } from '@/store/useWizardStore';
import { CurrentClusterForm } from './CurrentClusterForm';
import { DerivedMetricsPanel } from './DerivedMetricsPanel';
import { FileImportButton } from './FileImportButton';
import { ScopeBadge } from './ScopeBadge';

export function Step1CurrentCluster() {
  const nextStep = useWizardStore((s) => s.nextStep);
  const { t } = useTranslation('step1');
  useRecomputeCluster();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>
        <FileImportButton />
      </div>
      <ScopeBadge />
      <ExclusionSummaryCard />
      <CurrentClusterForm onNext={nextStep} />
      <DerivedMetricsPanel />
    </div>
  );
}
