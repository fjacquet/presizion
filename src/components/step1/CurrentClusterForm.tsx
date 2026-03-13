import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Info } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { currentClusterSchema, type CurrentClusterInput } from '@/schemas/currentClusterSchema'
import { useClusterStore } from '@/store/useClusterStore'
import { useWizardStore } from '@/store/useWizardStore'
import type { OldCluster } from '@/types/cluster'

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
  specintPerServer: 'SPECrate2017_int_base score per existing server. Find at spec.org/cpu2017/results/ → filter by server model. Default is Dell R660 with 2× Xeon Gold 6526Y (~337). Both existing and target must use the same metric.',
  cpuUtilizationPercent: 'Current average CPU utilization percent (0–100). Used to scale effective vCPU demand.',
  ramUtilizationPercent: 'Current average RAM utilization percent (0–100). Used to scale effective RAM demand.',
}

interface NumericFieldProps {
  // Control<TFieldValues, TContext, TTransformedValues> — TTransformedValues matches
  // the output of zodResolver with z.preprocess schemas (resolved output type)
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

interface CurrentClusterFormProps {
  onNext: () => void
}

export function CurrentClusterForm({ onNext }: CurrentClusterFormProps) {
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster)
  const currentCluster = useClusterStore((s) => s.currentCluster)
  const sizingMode = useWizardStore((s) => s.sizingMode)

  const form = useForm<CurrentClusterInput>({
    // zodResolver with z.preprocess schemas has a known type mismatch: the schema's
    // input type uses `unknown` while useForm expects the output type. Cast to resolve.
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
    },
  })

  // Sync Zustand store → form when cluster data is updated externally (e.g. file import).
  // Guard with value-equality to prevent infinite re-render loop.
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
      formVals.specintPerServer !== currentCluster.specintPerServer
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
      })
    }
  }, [currentCluster, form])

  // Sync valid form values to Zustand store for live DerivedMetricsPanel updates.
  // Uses watch(callback) subscription to fire only on actual value changes,
  // not on every render (avoids infinite setState loop with new object refs).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const { unsubscribe } = form.watch(() => {
      if (form.formState.isValid) {
        setCurrentCluster(form.getValues() as OldCluster)
      }
    })
    return unsubscribe
  }, [form, setCurrentCluster])

  // Auto-derive totalPcores from existingServerCount × socketsPerServer × coresPerSocket
  // Only fires when totalPcores is 0/falsy (does not override manually entered values)
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

  // Navigation guard: trigger validation on required fields before advancing.
  // In SPECint mode, also require specintPerServer to have a value.
  async function handleNext() {
    const alwaysRequired: Array<keyof CurrentClusterInput> = ['totalVcpus', 'totalPcores', 'totalVms']
    const modeRequired: Array<keyof CurrentClusterInput> =
      sizingMode === 'specint' ? ['specintPerServer'] : []
    const isValid = await form.trigger([...alwaysRequired, ...modeRequired])
    // Extra check: in specint mode, specintPerServer must have a value (schema allows undefined)
    if (isValid && sizingMode === 'specint') {
      const specintVal = form.getValues('specintPerServer')
      if (!specintVal) return // Block advance without calling onNext
    }
    if (isValid) onNext()
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
            <NumericFormField control={form.control} name="cpuUtilizationPercent" label="CPU Utilization %" testId="input-cpuUtilizationPercent" optional />
            <NumericFormField control={form.control} name="ramUtilizationPercent" label="RAM Utilization %" testId="input-ramUtilizationPercent" optional />
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

        <Button type="button" onClick={handleNext} className="w-full sm:w-auto">
          Next: Define Scenarios
        </Button>
      </form>
    </Form>
  )
}
