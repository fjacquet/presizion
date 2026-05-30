import { zodResolver } from '@hookform/resolvers/zod';
import { ExternalLink, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { type Control, useForm } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
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

// Tooltip text constants (UX-03)
const TOOLTIPS: Record<keyof CurrentClusterInput, string> = {
  totalVcpus:
    'Total vCPU reservations across all VMs. Found in vCenter Summary or cluster overview.',
  totalPcores:
    'Physical CPU cores in the cluster. Use spec sheet cores — NOT hyperthreaded logical CPUs.',
  totalVms: 'Total number of powered-on VMs in the cluster.',
  totalDiskGb: 'Total provisioned disk space across all VMs (GB).',
  socketsPerServer: 'Number of physical CPU sockets per existing server.',
  coresPerSocket: 'Physical cores per socket from spec sheet — NOT OS-reported logical processors.',
  ramPerServerGb: 'Total RAM installed per existing server (GB).',
  existingServerCount:
    'Number of physical servers currently in the cluster (used for SPECint sizing).',
  specintPerServer:
    'SPECrate2017_int_base score per existing server. Find at fjacquet.github.io/spec-search → filter by processor. Default is Dell R660 with 2x Xeon Gold 6526Y (~337). Both existing and target must use the same metric.',
  cpuUtilizationPercent:
    'Current average CPU utilization percent (0–100). Used to scale effective vCPU demand.',
  ramUtilizationPercent:
    'Current average RAM utilization percent (0–100). Used to scale effective RAM demand.',
  cpuFrequencyGhz:
    'Average CPU clock frequency of existing servers in GHz. Auto-filled from RVTools/LiveOptics import when available.',
  isStretchCluster:
    'Stretched cluster: each site must carry the full workload on failure. Sizing doubles the server count and rounds up to an even number.',
};

interface NumericFieldProps {
  // biome-ignore lint/suspicious/noExplicitAny: react-hook-form Control's transform-type generic requires any
  control: Control<CurrentClusterInput, any, CurrentClusterInput>;
  name: keyof CurrentClusterInput;
  label: string;
  testId: string;
  optional?: boolean;
}

/** Coerce form field values (which may include boolean for isStretchCluster) to a number-input-safe string. */
function toInputValue(val: unknown, optional: boolean): string | number {
  if (typeof val === 'boolean') return '';
  if (val == null) return optional ? '' : 0;
  return val as string | number;
}

function NumericFormField({ control, name, label, testId, optional }: NumericFieldProps) {
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
                    className="h-3.5 w-3.5 text-muted-foreground cursor-help"
                    aria-label={`Info: ${label}`}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{TOOLTIPS[name]}</p>
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
      isStretchCluster: undefined,
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
      formVals.cpuFrequencyGhz !== currentCluster.cpuFrequencyGhz ||
      formVals.isStretchCluster !== currentCluster.isStretchCluster;
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
        isStretchCluster: currentCluster.isStretchCluster,
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
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Cluster Totals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumericFormField
              control={form.control}
              name="totalVcpus"
              label="Total vCPUs"
              testId="input-totalVcpus"
            />
            <NumericFormField
              control={form.control}
              name="totalPcores"
              label="Total pCores"
              testId="input-totalPcores"
            />
            <NumericFormField
              control={form.control}
              name="totalVms"
              label="Total VMs"
              testId="input-totalVms"
            />
          </div>
          <div className="mt-4">
            <NumericFormField
              control={form.control}
              name="totalDiskGb"
              label="Total Disk GB (optional)"
              testId="input-totalDiskGb"
              optional
            />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Existing Server Config (optional)
          </h3>
          {currentCluster.cpuModel && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm text-muted-foreground">Detected CPU:</span>
              <Badge variant="secondary">{currentCluster.cpuModel}</Badge>
            </div>
          )}
          {currentCluster.cpuModel && (
            <button
              type="button"
              onClick={handleSpecLookup}
              className="inline-flex items-center gap-1 text-sm text-primary underline-offset-3 hover:underline mb-3"
            >
              Look up SPECrate <ExternalLink className="h-3 w-3" />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumericFormField
              control={form.control}
              name="existingServerCount"
              label="Existing Server Count"
              testId="input-existingServerCount"
              optional
            />
            <NumericFormField
              control={form.control}
              name="socketsPerServer"
              label="Sockets/Server"
              testId="input-socketsPerServer"
              optional
            />
            <NumericFormField
              control={form.control}
              name="coresPerSocket"
              label="Cores/Socket (physical)"
              testId="input-coresPerSocket"
              optional
            />
            <NumericFormField
              control={form.control}
              name="ramPerServerGb"
              label="RAM/Server GB"
              testId="input-ramPerServerGb"
              optional
            />
          </div>
          <FormField
            control={form.control}
            name="isStretchCluster"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 mt-4">
                <FormControl>
                  <Switch
                    checked={field.value === true}
                    onCheckedChange={(v) => field.onChange(v)}
                    aria-label="Stretch cluster"
                    data-testid="input-isStretchCluster"
                  />
                </FormControl>
                <FormLabel className="flex items-center gap-1 !mt-0 cursor-pointer">
                  Stretch cluster
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info
                          className="h-3.5 w-3.5 text-muted-foreground cursor-help"
                          aria-label="Info: Stretch cluster"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-sm">{TOOLTIPS.isStretchCluster}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </FormLabel>
              </FormItem>
            )}
          />
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Current Utilization (required)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NumericFormField
              control={form.control}
              name="cpuUtilizationPercent"
              label="CPU Utilization %"
              testId="input-cpuUtilizationPercent"
            />
            <NumericFormField
              control={form.control}
              name="ramUtilizationPercent"
              label="RAM Utilization %"
              testId="input-ramUtilizationPercent"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Most environments run well below 100%.{' '}
            {currentCluster.isStretchCluster
              ? 'Stretch clusters often run <50% per site.'
              : 'Enter measured (LiveOptics) or a careful estimate.'}
          </p>
        </section>

        {sizingMode === 'performance' && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Performance Mode (optional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumericFormField
                control={form.control}
                name="specintPerServer"
                label="SPECrate2017_int_base / Server (existing)"
                testId="input-specintPerServer"
                optional
              />
              <NumericFormField
                control={form.control}
                name="cpuFrequencyGhz"
                label="CPU Frequency (GHz)"
                testId="input-cpuFrequencyGhz"
                optional
              />
            </div>
          </section>
        )}

        <Button type="button" onClick={handleNext} className="w-full sm:w-auto">
          Next: Define Scenarios
        </Button>
      </form>
    </Form>
  );
}
