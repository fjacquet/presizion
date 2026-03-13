import { useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2, Copy, Info } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { scenarioSchema, type ScenarioInput } from '@/schemas/scenarioSchema'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useWizardStore } from '@/store/useWizardStore'
import type { Scenario } from '@/types/cluster'

const TOOLTIPS: Partial<Record<keyof ScenarioInput, string>> = {
  socketsPerServer:        'Physical CPU sockets per target server. Check the vendor spec sheet.',
  coresPerSocket:          'Physical cores per socket — NOT hyperthreaded logical CPUs.',
  ramPerServerGb:          'Total RAM installed per target server (GB).',
  diskPerServerGb:         'Total usable storage per target server (GB).',
  targetVcpuToPCoreRatio:  'CPU oversubscription ratio. VMware recommends 4:1 for mixed workloads; use 2:1 for databases or CPU-intensive workloads.',
  ramPerVmGb:              'Average RAM per VM in your current cluster. In vCenter: Monitor → Memory Used ÷ VM count. Available from LiveOptics/RVTools import.',
  diskPerVmGb:             'Average provisioned disk per VM. Auto-filled from Total Disk GB ÷ Total VMs when available. Or read from RVTools/LiveOptics import.',
  headroomPercent:         '20% means the sized cluster runs at 80% utilization, leaving buffer for spikes and growth.',
  haReserveEnabled:        'Adds one extra server to absorb a single host failure without breaching capacity. Recommended for production vSphere HA clusters.',
  targetSpecint:           'SPECrate2017_int_base score for the target server. Find at spec.org/cpu2017/results/ → filter by the new server model. Default is Dell R660 with 2× Xeon Gold 6526Y (337).',
}

function FieldLabel({ name, children }: { name: keyof ScenarioInput; children: React.ReactNode }) {
  const tip = TOOLTIPS[name]
  return (
    <FormLabel className="flex items-center gap-1">
      {children}
      {tip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" aria-label={`Info: ${String(children)}`} />
            </TooltipTrigger>
            <TooltipContent><p className="max-w-xs text-sm">{tip}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </FormLabel>
  )
}

interface ScenarioCardProps {
  scenarioId: string
}

export function ScenarioCard({ scenarioId }: ScenarioCardProps) {
  const scenario = useScenariosStore((s) => s.scenarios.find((sc) => sc.id === scenarioId))
  const updateScenario = useScenariosStore((s) => s.updateScenario)
  const removeScenario = useScenariosStore((s) => s.removeScenario)
  const duplicateScenario = useScenariosStore((s) => s.duplicateScenario)
  const sizingMode = useWizardStore((s) => s.sizingMode)

  const form = useForm<ScenarioInput>({
    // zodResolver with z.preprocess schemas has a known type mismatch: the schema's
    // input type uses `unknown` while useForm expects the output type. Cast to resolve.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(scenarioSchema) as any,
    mode: 'onBlur',
    defaultValues: scenario as ScenarioInput,
  })

  // Sync valid form values to store on every change.
  // Use a ref to hold stable references so the subscription callback doesn't re-register.
  const scenarioIdRef = useRef(scenarioId)
  scenarioIdRef.current = scenarioId
  const updateScenarioRef = useRef(updateScenario)
  updateScenarioRef.current = updateScenario

  useEffect(() => {
    // Subscribe to form value changes; returns an unsubscribe function
    const subscription = form.watch((values) => {
      const result = scenarioSchema.safeParse(values)
      if (result.success) {
        updateScenarioRef.current(scenarioIdRef.current, result.data as Partial<Scenario>)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  // Derived metric: total cores per server
  const socketsVal = Number(form.watch('socketsPerServer')) || 0
  const coresVal = Number(form.watch('coresPerSocket')) || 0
  const totalCores = socketsVal > 0 && coresVal > 0 ? socketsVal * coresVal : null

  // Helper: pass raw string to field.onChange (preserves z.preprocess behavior)
  function numericField(field: {
    onChange: (v: string) => void
    [k: string]: unknown
  }) {
    return {
      ...field,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value),
    }
  }

  if (!scenario) return null

  return (
    <Card className="w-full">
      <Form {...form}>
        <form className="space-y-0" onSubmit={(e) => e.preventDefault()}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex-1 min-w-0">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                        placeholder="Scenario name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-2 ml-4 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => duplicateScenario(scenarioId)}
                aria-label="Duplicate scenario"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeScenario(scenarioId)}
                aria-label="Remove scenario"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Server Configuration (SCEN-02) */}
            <section>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Target Server Config
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="socketsPerServer"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="socketsPerServer">Sockets/Server</FieldLabel>
                      <FormControl>
                        <Input type="number" min={1} {...numericField(field)} />
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
                      <FieldLabel name="coresPerSocket">Cores/Socket</FieldLabel>
                      <FormControl>
                        <Input type="number" min={1} {...numericField(field)} />
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
                      <FieldLabel name="ramPerServerGb">RAM/Server GB</FieldLabel>
                      <FormControl>
                        <Input type="number" min={1} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diskPerServerGb"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="diskPerServerGb">Disk/Server GB</FieldLabel>
                      <FormControl>
                        <Input type="number" min={1} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {totalCores !== null && (
                <p className="text-sm text-muted-foreground mt-2">
                  Total cores/server:{' '}
                  <span className="font-semibold tabular-nums">{totalCores}</span>
                </p>
              )}
            </section>

            <Separator />

            {/* Sizing Assumptions (SCEN-03) */}
            <section>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Sizing Assumptions
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="targetVcpuToPCoreRatio"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="targetVcpuToPCoreRatio">vCPU:pCore Ratio</FieldLabel>
                      <FormControl>
                        <Input type="number" min={0.1} step={0.5} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ramPerVmGb"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="ramPerVmGb">RAM/VM GB</FieldLabel>
                      <FormControl>
                        <Input type="number" min={0.1} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diskPerVmGb"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="diskPerVmGb">Disk/VM GB</FieldLabel>
                      <FormControl>
                        <Input type="number" min={0.1} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="headroomPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="headroomPercent">Headroom %</FieldLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="haReserveEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="N+1 HA Reserve"
                        />
                      </FormControl>
                      <FieldLabel name="haReserveEnabled">N+1 HA Reserve</FieldLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {sizingMode === 'specint' && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  SPECrate2017 Target (required in SPECrate mode)
                </p>
                <Controller
                  control={form.control}
                  name="targetSpecint"
                  render={({ field, fieldState }) => (
                    <div className="space-y-1">
                      <Label htmlFor={`${scenarioId}-targetSpecint`}>SPECrate2017_int_base / Server (target)</Label>
                      <Input
                        id={`${scenarioId}-targetSpecint`}
                        type="number"
                        min={1}
                        data-testid={`input-targetSpecint-${scenarioId}`}
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                      />
                      {fieldState.error && (
                        <p className="text-sm text-destructive">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            )}
          </CardContent>
        </form>
      </Form>
    </Card>
  )
}
