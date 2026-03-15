import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Info, ExternalLink } from 'lucide-react'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { currentClusterSchema, type CurrentClusterInput } from '@/schemas/currentClusterSchema'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useWizardStore } from '@/store/useWizardStore'
import { toast } from 'sonner'
import type { OldCluster } from '@/types/cluster'
import { cpuModelToSlug } from '@/lib/utils/specLookup'
import { SPEC_SEARCH_WEB_URL } from '@/lib/config'
import { useSpecLookup } from '@/hooks/useSpecLookup'
import { SpecResultsPanel } from '@/components/common/SpecResultsPanel'

// Tooltip text constants (UX-03)
const TOOLTIPS: Record<keyof CurrentClusterInput, string> = {
  totalVcpus: 'Total vCPU reservations across all VMs. Found in vCenter Summary or cluster overview.',
  totalPcores: 'Physical CPU cores in the cluster. Use spec sheet cores — NOT hyperthreaded logical CPUs.',
  totalVms: 'Total number of powered-on VMs in the cluster.',
  totalDiskGb: 'Total provisioned disk space across all VMs (GB).',
  socketsPerServer: 'Number of physical CPU sockets per existing server.',
  coresPerSocket: 'Physical cores per socket from spec sheet — NOT OS-reported logical processors.',
  ramPerServerGb: 'Total RAM installed per existing server (GB).',
  existingServerCount: 'Number of physical servers currently in the cluster (used for SPECint sizing).',
  specintPerServer: 'SPECrate2017_int_base score per existing server. Find at fjacquet.github.io/spec-search → filter by processor. Default is Dell R660 with 2x Xeon Gold 6526Y (~337). Both existing and target must use the same metric.',
  cpuUtilizationPercent: 'Current average CPU utilization percent (0–100). Used to scale effective vCPU demand.',
  ramUtilizationPercent: 'Current average RAM utilization percent (0–100). Used to scale effective RAM demand.',
  cpuFrequencyGhz: 'Average CPU clock frequency of existing servers in GHz. Auto-filled from RVTools/LiveOptics import when available.',
}

interface NumericFieldProps {
  control: Control<CurrentClusterInput, any, CurrentClusterInput> // eslint-disable-line @typescript-eslint/no-explicit-any
  name: keyof CurrentClusterInput
  label: string
  testId: string
  optional?: boolean
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
              value={optional ? (field.value ?? '') : field.value}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Numeric field with an activation checkbox — when unchecked, value is cleared to undefined. */
function CheckboxNumericField({
  control,
  name,
  label,
  testId,
  enabled,
  onToggle,
}: NumericFieldProps & { enabled: boolean; onToggle: (checked: boolean) => void }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${name}-enabled`}
              checked={enabled}
              onCheckedChange={onToggle}
            />
            <FormLabel className="flex items-center gap-1 cursor-pointer" htmlFor={`${name}-enabled`}>
              {label}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" aria-label={`Info: ${label}`} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">{TOOLTIPS[name]}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </FormLabel>
          </div>
          <FormControl>
            <Input
              type="number"
              min={0}
              max={100}
              data-testid={testId}
              disabled={!enabled}
              {...field}
              value={enabled ? (field.value ?? '') : ''}
              onChange={(e) => field.onChange(e.target.value)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface CurrentClusterFormProps {
  onNext: () => void
}

export function CurrentClusterForm({ onNext }: CurrentClusterFormProps) {
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster)
  const currentCluster = useClusterStore((s) => s.currentCluster)
  const seedFromCluster = useScenariosStore((s) => s.seedFromCluster)
  const sizingMode = useWizardStore((s) => s.sizingMode)

  const [cpuUtilEnabled, setCpuUtilEnabled] = useState(() => currentCluster.cpuUtilizationPercent !== undefined)
  const [ramUtilEnabled, setRamUtilEnabled] = useState(() => currentCluster.ramUtilizationPercent !== undefined)
  const [selectedSpecScore, setSelectedSpecScore] = useState<number | undefined>(undefined)
  const { results: specResults, status: specStatus, isLoading: specLoading } = useSpecLookup(currentCluster.cpuModel)

  const form = useForm<CurrentClusterInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(currentClusterSchema) as any,
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
  })

  // Sync Zustand store → form when cluster data is updated externally (e.g. file import).
  useEffect(() => {
    const formVals = form.getValues()
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
      formVals.cpuFrequencyGhz !== currentCluster.cpuFrequencyGhz
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
      })
      // Sync checkbox enabled state when cluster is imported
      if (currentCluster.cpuUtilizationPercent !== undefined) setCpuUtilEnabled(true)
      if (currentCluster.ramUtilizationPercent !== undefined) setRamUtilEnabled(true)
    }
  }, [currentCluster, form])

  // Sync valid form values to Zustand store for live DerivedMetricsPanel updates.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const { unsubscribe } = form.watch(() => {
      if (form.formState.isValid) {
        // Merge form values over existing cluster to preserve non-form fields
        // (cpuModel, cpuFrequencyGhz, avgRamPerVmGb, etc.)
        const existing = useClusterStore.getState().currentCluster
        setCurrentCluster({ ...existing, ...form.getValues() } as OldCluster)
      }
    })
    return unsubscribe
  }, [form, setCurrentCluster])

  // Auto-derive totalPcores from existingServerCount × socketsPerServer × coresPerSocket
  useEffect(() => {
    const subscription = form.watch((data, { name }) => {
      if (name && ['existingServerCount', 'socketsPerServer', 'coresPerSocket'].includes(name)) {
        const { existingServerCount, socketsPerServer, coresPerSocket } = data
        if (existingServerCount && socketsPerServer && coresPerSocket) {
          const derived = existingServerCount * socketsPerServer * coresPerSocket
          if (!form.getValues('totalPcores')) {
            form.setValue('totalPcores', derived, { shouldValidate: true })
          }
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  async function handleSpecLookup() {
    if (currentCluster.cpuModel) {
      // Extract short model number (e.g., "6526Y" from "Intel(R) Xeon(R) Gold 6526Y CPU @ 2.40GHz")
      const match = currentCluster.cpuModel.match(/(\d{4}\w*)\s*(?:CPU|$)/i)
      const modelNumber = match ? match[1]! : currentCluster.cpuModel
      try {
        await navigator.clipboard.writeText(modelNumber)
        toast(`"${modelNumber}" copied — paste into Processor field`)
      } catch {
        // Clipboard API may fail in non-secure contexts; proceed anyway
      }
      const slug = cpuModelToSlug(currentCluster.cpuModel)
      window.open(`${SPEC_SEARCH_WEB_URL}/#/processor/${slug}`, '_blank', 'noopener,noreferrer')
    }
  }

  async function handleNext() {
    const alwaysRequired: Array<keyof CurrentClusterInput> = ['totalVcpus', 'totalPcores', 'totalVms']
    const modeRequired: Array<keyof CurrentClusterInput> =
      sizingMode === 'specint' ? ['specintPerServer'] :
      sizingMode === 'ghz' ? ['cpuFrequencyGhz'] : []
    const isValid = await form.trigger([...alwaysRequired, ...modeRequired])
    if (isValid && sizingMode === 'specint') {
      if (!form.getValues('specintPerServer')) return
    }
    if (isValid && sizingMode === 'ghz') {
      if (!form.getValues('cpuFrequencyGhz')) return
    }
    if (isValid) {
      // Parse through Zod schema to get properly typed numbers (form.getValues returns raw HTML strings)
      const parseResult = currentClusterSchema.safeParse(form.getValues())
      const typedValues = parseResult.success ? parseResult.data : form.getValues()
      // Merge over existing cluster to preserve fields not in the form (avgRamPerVmGb, cpuModel)
      const merged: OldCluster = { ...currentCluster, ...(typedValues as Partial<OldCluster>) }
      setCurrentCluster(merged)
      seedFromCluster(merged)
      onNext()
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
            <NumericFormField control={form.control} name="totalVcpus" label="Total vCPUs" testId="input-totalVcpus" />
            <NumericFormField control={form.control} name="totalPcores" label="Total pCores" testId="input-totalPcores" />
            <NumericFormField control={form.control} name="totalVms" label="Total VMs" testId="input-totalVms" />
          </div>
          <div className="mt-4">
            <NumericFormField control={form.control} name="totalDiskGb" label="Total Disk GB (optional)" testId="input-totalDiskGb" optional />
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
              onSelect={(baseScore) => {
                setSelectedSpecScore(baseScore)
                form.setValue('specintPerServer', baseScore, { shouldValidate: true })
              }}
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumericFormField control={form.control} name="existingServerCount" label="Existing Server Count" testId="input-existingServerCount" optional />
            <NumericFormField control={form.control} name="socketsPerServer" label="Sockets/Server" testId="input-socketsPerServer" optional />
            <NumericFormField control={form.control} name="coresPerSocket" label="Cores/Socket (physical)" testId="input-coresPerSocket" optional />
            <NumericFormField control={form.control} name="ramPerServerGb" label="RAM/Server GB" testId="input-ramPerServerGb" optional />
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Current Utilization (optional)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sizingMode !== 'specint' && (
              <CheckboxNumericField
                control={form.control}
                name="cpuUtilizationPercent"
                label="CPU Utilization %"
                testId="input-cpuUtilizationPercent"
                enabled={cpuUtilEnabled}
                onToggle={(checked) => {
                  setCpuUtilEnabled(checked)
                  if (!checked) form.setValue('cpuUtilizationPercent', undefined, { shouldValidate: true })
                }}
              />
            )}
            <CheckboxNumericField
              control={form.control}
              name="ramUtilizationPercent"
              label="RAM Utilization %"
              testId="input-ramUtilizationPercent"
              enabled={ramUtilEnabled}
              onToggle={(checked) => {
                setRamUtilEnabled(checked)
                if (!checked) form.setValue('ramUtilizationPercent', undefined, { shouldValidate: true })
              }}
            />
          </div>
        </section>

        {sizingMode === 'specint' && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              SPECrate2017 Mode (required)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumericFormField control={form.control} name="specintPerServer" label="SPECrate2017_int_base / Server (existing)" testId="input-specintPerServer" optional />
            </div>
          </section>
        )}

        {sizingMode === 'ghz' && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              GHz Mode (required)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumericFormField control={form.control} name="cpuFrequencyGhz" label="CPU Frequency (GHz)" testId="input-cpuFrequencyGhz" optional />
            </div>
          </section>
        )}

        <Button type="button" onClick={handleNext} className="w-full sm:w-auto">
          Next: Define Scenarios
        </Button>
      </form>
    </Form>
  )
}
