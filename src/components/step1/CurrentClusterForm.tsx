import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Control, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { SpecResultsPanel } from '@/components/common/SpecResultsPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSpecLookup } from '@/hooks/useSpecLookup';
import { SPEC_SEARCH_WEB_URL } from '@/lib/config';
import { cpuModelToSlug } from '@/lib/utils/specLookup';
import { currentClusterFormSchema } from '@/schemas/currentClusterFormSchema';
import type { CurrentClusterInput } from '@/schemas/currentClusterSchema';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';
import type { OldCluster } from '@/types/cluster';

interface NumericFieldProps {
  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form Control's transform-type generic requires any
  control: Control<CurrentClusterInput, any, CurrentClusterInput>;
  name: keyof CurrentClusterInput;
  label: string;
  tooltip: string;
  testId: string;
  optional?: boolean;
}

/** Coerce form field values (which may include boolean for isStretchCluster) to a number-input-safe string. */
function toInputValue(val: unknown, optional: boolean): string | number {
  if (typeof val === 'boolean') return '';
  if (val == null) return optional ? '' : 0;
  return val as string | number;
}

function NumericFormField({ control, name, label, tooltip, testId, optional }: NumericFieldProps) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center gap-1">
            {label}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info
                    className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 cursor-help"
                    aria-label={`Info: ${label}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </FormLabel>
          <FormControl>
            <Input
              type="number"
              min={0}
              data-testid={testId}
              {...field}
              value={toInputValue(field.value, optional ?? false)}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface CurrentClusterFormProps {
  onNext: () => void;
}

export function CurrentClusterForm({ onNext }: CurrentClusterFormProps) {
  const { t } = useTranslation('step1');
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster);
  const currentCluster = useClusterStore((s) => s.currentCluster);
  const seedFromCluster = useScenariosStore((s) => s.seedFromCluster);
  const sizingMode = useWizardStore((s) => s.sizingMode);

  const [selectedSpecScore, setSelectedSpecScore] = useState<number | undefined>(undefined);
  const {
    results: specResults,
    status: specStatus,
    isLoading: specLoading,
  } = useSpecLookup(currentCluster.cpuModel);

  const form = useForm<CurrentClusterInput>({
    // biome-ignore lint/suspicious/noExplicitAny: zodResolver input/output type mismatch needs any
    resolver: zodResolver(currentClusterFormSchema) as any,
    mode: 'onBlur',
    defaultValues: {
      totalVcpus: 0,
      totalPcores: 0,
      totalVms: 0,
      totalDiskGb: undefined,
      socketsPerServer: undefined,
      coresPerSocket: undefined,
      ramPerServerGb: undefined,
      specintPerServer: undefined,
      cpuUtilizationPercent: undefined,
      ramUtilizationPercent: undefined,
      existingServerCount: undefined,
      cpuFrequencyGhz: undefined,
    },
  });

  // Sync Zustand store → form when cluster data is updated externally (e.g. file import).
  useEffect(() => {
    const formVals = form.getValues();
    const changed =
      formVals.totalVcpus !== (currentCluster.totalVcpus ?? 0) ||
      formVals.totalPcores !== (currentCluster.totalPcores ?? 0) ||
      formVals.totalVms !== (currentCluster.totalVms ?? 0) ||
      formVals.totalDiskGb !== currentCluster.totalDiskGb ||
      formVals.existingServerCount !== currentCluster.existingServerCount ||
      formVals.socketsPerServer !== currentCluster.socketsPerServer ||
      formVals.coresPerSocket !== currentCluster.coresPerSocket ||
      formVals.ramPerServerGb !== currentCluster.ramPerServerGb ||
      formVals.cpuUtilizationPercent !== currentCluster.cpuUtilizationPercent ||
      formVals.ramUtilizationPercent !== currentCluster.ramUtilizationPercent ||
      formVals.specintPerServer !== currentCluster.specintPerServer ||
      formVals.cpuFrequencyGhz !== currentCluster.cpuFrequencyGhz;
    if (changed) {
      form.reset({
        ...formVals,
        totalVcpus: currentCluster.totalVcpus ?? 0,
        totalPcores: currentCluster.totalPcores ?? 0,
        totalVms: currentCluster.totalVms ?? 0,
        totalDiskGb: currentCluster.totalDiskGb,
        existingServerCount: currentCluster.existingServerCount,
        socketsPerServer: currentCluster.socketsPerServer,
        coresPerSocket: currentCluster.coresPerSocket,
        ramPerServerGb: currentCluster.ramPerServerGb,
        cpuUtilizationPercent: currentCluster.cpuUtilizationPercent,
        ramUtilizationPercent: currentCluster.ramUtilizationPercent,
        specintPerServer: currentCluster.specintPerServer,
        cpuFrequencyGhz: currentCluster.cpuFrequencyGhz,
      });
    }
  }, [currentCluster, form]);

  // Sync valid form values to Zustand store for live DerivedMetricsPanel updates.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const { unsubscribe } = form.watch(() => {
      if (form.formState.isValid) {
        // Merge form values over existing cluster to preserve non-form fields
        // (cpuModel, cpuFrequencyGhz, avgRamPerVmGb, etc.)
        // Filter out undefined values to avoid overwriting import data with undefined
        const existing = useClusterStore.getState().currentCluster;
        const formValues = form.getValues();
        const defined = Object.fromEntries(
          Object.entries(formValues).filter(([, v]) => v !== undefined && v !== null),
        );
        setCurrentCluster({ ...existing, ...defined } as OldCluster);
      }
    });
    return unsubscribe;
  }, [form, setCurrentCluster]);

  // Auto-derive totalPcores from existingServerCount × socketsPerServer × coresPerSocket
  useEffect(() => {
    const subscription = form.watch((data, { name }) => {
      if (name && ['existingServerCount', 'socketsPerServer', 'coresPerSocket'].includes(name)) {
        const { existingServerCount, socketsPerServer, coresPerSocket } = data;
        if (existingServerCount && socketsPerServer && coresPerSocket) {
          const derived = existingServerCount * socketsPerServer * coresPerSocket;
          if (!form.getValues('totalPcores')) {
            form.setValue('totalPcores', derived, { shouldValidate: true });
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  async function handleSpecLookup() {
    if (currentCluster.cpuModel) {
      // Extract short model number (e.g., "6526Y" from "Intel(R) Xeon(R) Gold 6526Y CPU @ 2.40GHz")
      const match = currentCluster.cpuModel.match(/(\d{4}\w*)\s*(?:CPU|$)/i);
      const modelNumber = match ? match[1]! : currentCluster.cpuModel;
      try {
        await navigator.clipboard.writeText(modelNumber);
        toast(`"${modelNumber}" copied — paste into Processor field`);
      } catch {
        // Clipboard API may fail in non-secure contexts; proceed anyway
      }
      const slug = cpuModelToSlug(currentCluster.cpuModel);
      window.open(`${SPEC_SEARCH_WEB_URL}/#/processor/${slug}`, '_blank', 'noopener,noreferrer');
    }
  }

  async function handleNext() {
    // Required for all modes: cluster totals + measured/estimated utilization.
    // Utilization is enforced as required by currentClusterFormSchema (the form resolver),
    // so triggering these fields surfaces the validation errors before advancing.
    const alwaysRequired: Array<keyof CurrentClusterInput> = [
      'totalVcpus',
      'totalPcores',
      'totalVms',
      'cpuUtilizationPercent',
      'ramUtilizationPercent',
    ];
    const isValid = await form.trigger(alwaysRequired);
    if (isValid) {
      // Parse through the strict form schema to get properly typed numbers (form.getValues returns raw HTML strings)
      const parseResult = currentClusterFormSchema.safeParse(form.getValues());
      const typedValues = parseResult.success ? parseResult.data : form.getValues();
      // Merge over existing cluster to preserve fields not in the form (avgRamPerVmGb, cpuModel)
      const merged: OldCluster = { ...currentCluster, ...(typedValues as Partial<OldCluster>) };
      setCurrentCluster(merged);
      seedFromCluster(merged);
      onNext();
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4 text-left" onSubmit={(e) => e.preventDefault()}>
        {/* Required-first: the two required input groups sit side by side. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <section className="panel">
            <h3 className="cockpit-eyebrow mb-4">
              {t('currentClusterForm.sections.clusterTotals')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumericFormField
                control={form.control}
                name="totalVcpus"
                label={t('currentClusterForm.fields.totalVcpus')}
                tooltip={t('currentClusterForm.tooltips.totalVcpus')}
                testId="input-totalVcpus"
              />
              <NumericFormField
                control={form.control}
                name="totalPcores"
                label={t('currentClusterForm.fields.totalPcores')}
                tooltip={t('currentClusterForm.tooltips.totalPcores')}
                testId="input-totalPcores"
              />
              <NumericFormField
                control={form.control}
                name="totalVms"
                label={t('currentClusterForm.fields.totalVms')}
                tooltip={t('currentClusterForm.tooltips.totalVms')}
                testId="input-totalVms"
              />
              <NumericFormField
                control={form.control}
                name="totalDiskGb"
                label={t('currentClusterForm.fields.totalDiskGb')}
                tooltip={t('currentClusterForm.tooltips.totalDiskGb')}
                testId="input-totalDiskGb"
                optional
              />
            </div>
          </section>

          <section className="panel">
            <h3 className="cockpit-eyebrow mb-4">
              {t('currentClusterForm.sections.currentUtilization')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumericFormField
                control={form.control}
                name="cpuUtilizationPercent"
                label={t('currentClusterForm.fields.cpuUtilizationPercent')}
                tooltip={t('currentClusterForm.tooltips.cpuUtilizationPercent')}
                testId="input-cpuUtilizationPercent"
              />
              <NumericFormField
                control={form.control}
                name="ramUtilizationPercent"
                label={t('currentClusterForm.fields.ramUtilizationPercent')}
                tooltip={t('currentClusterForm.tooltips.ramUtilizationPercent')}
                testId="input-ramUtilizationPercent"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              {currentCluster.isStretchCluster
                ? t('currentClusterForm.utilizationHintStretch')
                : t('currentClusterForm.utilizationHint')}
            </p>
          </section>
        </div>

        <section className="panel">
          <h3 className="cockpit-eyebrow mb-4">
            {t('currentClusterForm.sections.existingServerConfig')}
          </h3>
          {currentCluster.cpuModel && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {t('currentClusterForm.detectedCpu')}
              </span>
              <Badge variant="secondary">{currentCluster.cpuModel}</Badge>
            </div>
          )}
          {currentCluster.cpuModel && (
            <button
              type="button"
              onClick={handleSpecLookup}
              className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-300 underline-offset-3 hover:underline mb-3"
            >
              {t('currentClusterForm.lookupSpecrate')} <ExternalLink className="h-3 w-3" />
            </button>
          )}
          {currentCluster.cpuModel && (
            <SpecResultsPanel
              results={specResults}
              status={specStatus}
              isLoading={specLoading}
              selectedScore={selectedSpecScore}
              onSelect={(result) => {
                setSelectedSpecScore(result.baseResult);
                form.setValue('specintPerServer', result.baseResult, { shouldValidate: true });
              }}
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <NumericFormField
              control={form.control}
              name="existingServerCount"
              label={t('currentClusterForm.fields.existingServerCount')}
              tooltip={t('currentClusterForm.tooltips.existingServerCount')}
              testId="input-existingServerCount"
              optional
            />
            <NumericFormField
              control={form.control}
              name="socketsPerServer"
              label={t('currentClusterForm.fields.socketsPerServer')}
              tooltip={t('currentClusterForm.tooltips.socketsPerServer')}
              testId="input-socketsPerServer"
              optional
            />
            <NumericFormField
              control={form.control}
              name="coresPerSocket"
              label={t('currentClusterForm.fields.coresPerSocket')}
              tooltip={t('currentClusterForm.tooltips.coresPerSocket')}
              testId="input-coresPerSocket"
              optional
            />
            <NumericFormField
              control={form.control}
              name="ramPerServerGb"
              label={t('currentClusterForm.fields.ramPerServerGb')}
              tooltip={t('currentClusterForm.tooltips.ramPerServerGb')}
              testId="input-ramPerServerGb"
              optional
            />
          </div>
        </section>

        {sizingMode === 'performance' && (
          <section className="panel">
            <h3 className="cockpit-eyebrow mb-4">
              {t('currentClusterForm.sections.performanceMode')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumericFormField
                control={form.control}
                name="specintPerServer"
                label={t('currentClusterForm.fields.specintPerServer')}
                tooltip={t('currentClusterForm.tooltips.specintPerServer')}
                testId="input-specintPerServer"
                optional
              />
              <NumericFormField
                control={form.control}
                name="cpuFrequencyGhz"
                label={t('currentClusterForm.fields.cpuFrequencyGhz')}
                tooltip={t('currentClusterForm.tooltips.cpuFrequencyGhz')}
                testId="input-cpuFrequencyGhz"
                optional
              />
            </div>
          </section>
        )}

        <Button type="button" onClick={handleNext} className="w-full sm:w-auto">
          {t('currentClusterForm.nextButton')}
        </Button>
      </form>
    </Form>
  );
}
