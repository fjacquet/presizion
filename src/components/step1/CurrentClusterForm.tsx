import { useForm } from 'react-hook-form'
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
import type { OldCluster } from '@/types/cluster'

// Tooltip text constants (UX-03)
const TOOLTIPS = {
  totalVcpus:
    'Total vCPU reservations across all VMs in the cluster. Found in vCenter Summary or cluster overview.',
  totalPcores:
    'Physical CPU cores in the cluster. Use cores from server spec sheet — NOT logical processors (hyperthreaded count).',
  totalVms: 'Total number of powered-on VMs in the cluster.',
  totalDiskGb: 'Total provisioned disk space across all VMs in the cluster (GB).',
  socketsPerServer: 'Number of physical CPU sockets per existing server.',
  coresPerSocket:
    'Physical cores per socket. From server spec sheet — NOT OS-reported logical processors.',
  ramPerServerGb: 'Total RAM installed per existing server (GB).',
} as const

function FieldLabel({ name, tip }: { name: string; tip: string }) {
  return (
    <FormLabel className="flex items-center gap-1">
      {name}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info
              className="h-3.5 w-3.5 text-muted-foreground cursor-help"
              aria-label={`Info: ${name}`}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{tip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </FormLabel>
  )
}

interface CurrentClusterFormProps {
  onNext: () => void
}

export function CurrentClusterForm({ onNext }: CurrentClusterFormProps) {
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster)

  const form = useForm<CurrentClusterInput>({
    resolver: zodResolver(currentClusterSchema),
    mode: 'onBlur',
    defaultValues: {
      totalVcpus: 0,
      totalPcores: 0,
      totalVms: 0,
      totalDiskGb: undefined,
      socketsPerServer: undefined,
      coresPerSocket: undefined,
      ramPerServerGb: undefined,
    },
  })

  // Sync valid form values to Zustand store for live DerivedMetricsPanel updates
  const watched = form.watch()
  useEffect(() => {
    if (form.formState.isValid) {
      setCurrentCluster(form.getValues() as OldCluster)
    }
  }, [watched, form.formState.isValid, setCurrentCluster])

  // Navigation guard: trigger validation on required fields before advancing
  async function handleNext() {
    const isValid = await form.trigger(['totalVcpus', 'totalPcores', 'totalVms'])
    if (isValid) onNext()
  }

  // Pass raw string to field.onChange — z.preprocess handles string→number conversion
  function numericOnChange(
    field: { onChange: (v: string) => void },
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    field.onChange(e.target.value)
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {/* Section: Cluster Totals (INPUT-02) */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Cluster Totals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="totalVcpus"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel name="Total vCPUs" tip={TOOLTIPS.totalVcpus} />
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      data-testid="input-totalVcpus"
                      {...field}
                      onChange={(e) => numericOnChange(field, e)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalPcores"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel name="Total pCores" tip={TOOLTIPS.totalPcores} />
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      data-testid="input-totalPcores"
                      {...field}
                      onChange={(e) => numericOnChange(field, e)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalVms"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel name="Total VMs" tip={TOOLTIPS.totalVms} />
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      data-testid="input-totalVms"
                      {...field}
                      onChange={(e) => numericOnChange(field, e)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="mt-4">
            <FormField
              control={form.control}
              name="totalDiskGb"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel name="Total Disk GB (optional)" tip={TOOLTIPS.totalDiskGb} />
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      data-testid="input-totalDiskGb"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => numericOnChange(field, e)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Section: Existing Server Config (INPUT-03) */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Existing Server Config (optional)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="socketsPerServer"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel name="Sockets/Server" tip={TOOLTIPS.socketsPerServer} />
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      data-testid="input-socketsPerServer"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => numericOnChange(field, e)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coresPerSocket"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel
                    name="Cores/Socket (physical)"
                    tip={TOOLTIPS.coresPerSocket}
                  />
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      data-testid="input-coresPerSocket"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => numericOnChange(field, e)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ramPerServerGb"
              render={({ field }) => (
                <FormItem>
                  <FieldLabel name="RAM/Server GB" tip={TOOLTIPS.ramPerServerGb} />
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      data-testid="input-ramPerServerGb"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => numericOnChange(field, e)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Button type="button" onClick={handleNext} className="w-full sm:w-auto">
          Next: Define Scenarios
        </Button>
      </form>
    </Form>
  )
}
