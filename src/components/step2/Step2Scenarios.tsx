import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { ScenarioCard } from './ScenarioCard';
import { ScenarioResults } from './ScenarioResults';

export function Step2Scenarios() {
  const { t } = useTranslation('step2');
  const scenarios = useScenariosStore((s) => s.scenarios);
  const addScenario = useScenariosStore((s) => s.addScenario);
  const currentCluster = useClusterStore((s) => s.currentCluster);

  const firstScenarioId = scenarios[0]?.id ?? '';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t('title')}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('subtitle')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const ramPerVmGb = currentCluster.avgRamPerVmGb;
            const diskPerVmGb =
              currentCluster.totalDiskGb && currentCluster.totalVms
                ? Math.round((currentCluster.totalDiskGb / currentCluster.totalVms) * 10) / 10
                : undefined;
            addScenario(
              ramPerVmGb != null || diskPerVmGb != null
                ? {
                    ...(ramPerVmGb != null && { ramPerVmGb }),
                    ...(diskPerVmGb != null && { diskPerVmGb }),
                  }
                : undefined,
            );
          }}
          aria-label={t('addScenario')}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('addScenario')}
        </Button>
      </div>

      <Tabs defaultValue={firstScenarioId} key={firstScenarioId}>
        <TabsList className="flex-wrap h-auto gap-1">
          {scenarios.map((scenario) => (
            <TabsTrigger key={scenario.id} value={scenario.id} className="text-sm">
              {scenario.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {scenarios.map((scenario) => (
          <TabsContent key={scenario.id} value={scenario.id}>
            {/* key=scenario.id forces fresh useForm init on duplicate (SCEN-05) */}
            <ScenarioCard key={scenario.id} scenarioId={scenario.id} />
            <ScenarioResults scenarioId={scenario.id} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
