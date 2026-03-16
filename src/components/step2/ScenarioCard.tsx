import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Trash2, Copy, Info } from 'lucide-react'
import { useSpecLookup } from '@/hooks/useSpecLookup'
import { SpecResultsPanel } from '@/components/common/SpecResultsPanel'
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
import { Checkbox } from '@/components/ui/checkbox'
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
import { useClusterStore } from '@/store/useClusterStore'
import type { Scenario } from '@/types/cluster'
import type { SpecResult } from '@/lib/utils/specLookup'
import { VsanGrowthSection } from './VsanGrowthSection'

const TOOLTIPS: Partial<Record<keyof ScenarioInput, string>> = {
  socketsPerServer:               'Physical CPU sockets per target server. Check the vendor spec sheet.',
  coresPerSocket:                 'Physical cores per socket — NOT hyperthreaded logical CPUs.',
  ramPerServerGb:                 'Total RAM installed per target server (GB).',
  diskPerServerGb:                'Total usable storage per target server (GB).',
  targetVcpuToPCoreRatio:         'Hard assignment-density cap: no more than N vCPUs per physical core. VMware recommends 4:1 for mixed workloads; use 2:1 for databases.',
  ramPerVmGb:                     'Average RAM per VM in your current cluster. In vCenter: Monitor → Memory Used ÷ VM count. Available from LiveOptics/RVTools import.',
  diskPerVmGb:                    'Average provisioned disk per VM. Auto-filled from Total Disk GB ÷ Total VMs when available. Or read from RVTools/LiveOptics import.',
  headroomPercent:                '20% means the sized cluster runs at 80% utilization, leaving buffer for spikes and growth.',
  targetSpecint:                  'SPECrate2017_int_base score for the target server. Find at spec.org/cpu2017/results/ → filter by the new server model. Default is Dell R660 with 2× Xeon Gold 6526Y (337).',
  targetCpuUtilizationPercent:    'Display reference only: the CPU utilization % you are designing for. Does not affect server count (the vCPU:pCore ratio is the hard cap).',
  targetRamUtilizationPercent:    'Design target: size the cluster so RAM runs at this utilization. E.g. 80% means current RAM demand fills 80% of new capacity (with headroom on top).',
  targetVmCount:                  'Growth override: size the cluster for this future VM count. vCPUs are scaled proportionally from the current cluster.',
  targetCpuFrequencyGhz:          'Target server CPU clock frequency in GHz. Used with current frequency to compute GHz demand ratio.',
  minServerCount:                 'Pin a minimum floor: the final server count will never go below this value, regardless of the computed sizing.',
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
  const layoutMode = useWizardStore((s) => s.layoutMode)
  const currentCluster = useClusterStore((s) => s.currentCluster)

  const [pinEnabled, setPinEnabled] = useState(() => !!scenario?.minServerCount)
  const [vsanGrowthOpen, setVsanGrowthOpen] = useState(false)

  // SPEC lookup: local UI state for target CPU model search (not persisted)
  const [targetCpuModel, setTargetCpuModel] = useState('')
  const [debouncedCpuModel, setDebouncedCpuModel] = useState<string | undefined>(undefined)
  const [selectedTargetScore, setSelectedTargetScore] = useState<number | undefined>(undefined)

  // Debounce targetCpuModel by 500ms
  useEffect(() => {
    if (!targetCpuModel.trim()) {
      setDebouncedCpuModel(undefined)
      return
    }
    const timer = setTimeout(() => {
      setDebouncedCpuModel(targetCpuModel)
    }, 500)
    return () => clearTimeout(timer)
  }, [targetCpuModel])

  const specLookup = useSpecLookup(
    sizingMode === 'specint' || sizingMode === 'vcpu' ? debouncedCpuModel : undefined,
  )

  const form = useForm<ScenarioInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(scenarioSchema) as any,
    mode: 'onBlur',
    defaultValues: scenario as ScenarioInput,
  })

  const handleSpecSelect = useCallback((result: SpecResult) => {
    setSelectedTargetScore(result.baseResult)
    form.setValue('targetSpecint', result.baseResult, { shouldValidate: true })
  }, [form])

  const scenarioIdRef = useRef(scenarioId)
  scenarioIdRef.current = scenarioId
  const updateScenarioRef = useRef(updateScenario)
  updateScenarioRef.current = updateScenario

  useEffect(() => {
    // eslint-disable-next-line react-hooks/incompatible-library
    const subscription = form.watch((values) => {
      const result = scenarioSchema.safeParse(values)
      if (result.success) {
        updateScenarioRef.current(scenarioIdRef.current, result.data as Partial<Scenario>)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  // Sync seeded fields from Zustand store → RHF form when they change externally (e.g. Step 1 → Next).
  // Use primitive deps so React only re-runs when VALUES change, preventing infinite loops:
  //   form.setValue → watch fires → updateScenario → same value in store → dep unchanged → no re-run ✓
  useEffect(() => {
    if (!scenario) return
    const seededFields = [
      'socketsPerServer', 'coresPerSocket', 'ramPerServerGb', 'ramPerVmGb', 'diskPerVmGb',
    ] as const
    seededFields.forEach((field) => {
      const storeVal = scenario[field]
      if (storeVal === undefined) return
      if (Number(form.getValues(field)) !== storeVal) {
        form.setValue(field, storeVal as never, { shouldDirty: false, shouldValidate: false })
      }
    })
  }, [
    scenario?.socketsPerServer,
    scenario?.coresPerSocket,
    scenario?.ramPerServerGb,
    scenario?.ramPerVmGb,
    scenario?.diskPerVmGb,
    form,
  ])

  // SPEC-06..08: In specint mode, auto-derive socket/core from cluster metadata (read-only)
  const hasMetadata = sizingMode === 'specint' &&
    currentCluster.socketsPerServer != null &&
    currentCluster.coresPerSocket != null

  const socketsVal = Number(form.watch('socketsPerServer')) || 0
  const coresVal = Number(form.watch('coresPerSocket')) || 0
  const totalCores = socketsVal > 0 && coresVal > 0 ? socketsVal * coresVal : null

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

  const cpuUtilLabel = sizingMode === 'ghz' ? 'Target CPU Load %' : 'Target CPU Util %'
  const cpuUtilTip = sizingMode === 'ghz'
    ? 'Design target: new servers will run at this CPU load at steady state.'
    : TOOLTIPS.targetCpuUtilizationPercent

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
            {/* Server Configuration */}
            <section>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Target Server Config
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <FormField control={form.control} name="socketsPerServer" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="socketsPerServer">Sockets/Server</FieldLabel>
                    <FormControl><Input type="number" min={1} disabled={hasMetadata} {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="coresPerSocket" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="coresPerSocket">Cores/Socket</FieldLabel>
                    <FormControl><Input type="number" min={1} disabled={hasMetadata} {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ramPerServerGb" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="ramPerServerGb">RAM/Server GB</FieldLabel>
                    <FormControl><Input type="number" min={1} {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {layoutMode !== 'disaggregated' && (
                  <FormField control={form.control} name="diskPerServerGb" render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="diskPerServerGb">Disk/Server GB</FieldLabel>
                      <FormControl><Input type="number" min={1} {...numericField(field)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
              {totalCores !== null && (
                <p className="text-sm text-muted-foreground mt-2">
                  Total cores/server: <span className="font-semibold tabular-nums">{totalCores}</span>
                </p>
              )}
              {sizingMode === 'specint' &&
                (currentCluster.socketsPerServer == null || currentCluster.coresPerSocket == null) && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                  No socket/core data from import — enter manually.
                </p>
              )}
              {sizingMode === 'vcpu' && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`${scenarioId}-vcpuTargetCpu`}>Look up target CPU (optional)</Label>
                  <Input
                    id={`${scenarioId}-vcpuTargetCpu`}
                    type="text"
                    placeholder="e.g. Xeon Gold 6526Y"
                    value={targetCpuModel}
                    onChange={(e) => setTargetCpuModel(e.target.value)}
                  />
                  {(debouncedCpuModel || specLookup.isLoading) && (
                    <SpecResultsPanel
                      results={specLookup.results}
                      status={specLookup.status}
                      isLoading={specLookup.isLoading}
                      onSelect={(result) => {
                        setSelectedTargetScore(result.baseResult)
                        if (result.chips > 0 && result.cores > 0) {
                          const coresPerSocket = Math.round(result.cores / result.chips)
                          form.setValue('socketsPerServer', result.chips, { shouldValidate: true })
                          form.setValue('coresPerSocket', coresPerSocket, { shouldValidate: true })
                        }
                      }}
                      selectedScore={selectedTargetScore}
                    />
                  )}
                </div>
              )}
            </section>

            <Separator />

            {/* Sizing Assumptions */}
            <section>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Sizing Assumptions
              </h4>

              {/* Aggressive mode info banner */}
              {sizingMode === 'aggressive' && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                  <Info className="h-4 w-4 shrink-0" />
                  Server count driven by CPU Util % from Step 1 — vCPU:pCore ratio cap bypassed
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {sizingMode === 'vcpu' && (
                  <FormField control={form.control} name="targetVcpuToPCoreRatio" render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="targetVcpuToPCoreRatio">vCPU:pCore Ratio</FieldLabel>
                      <FormControl><Input type="number" min={0.1} step={0.5} {...numericField(field)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="ramPerVmGb" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="ramPerVmGb">RAM/VM GB</FieldLabel>
                    <FormControl><Input type="number" min={0.1} {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="diskPerVmGb" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="diskPerVmGb">Disk/VM GB</FieldLabel>
                    <FormControl><Input type="number" min={0.1} {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="headroomPercent" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="headroomPercent">Headroom %</FieldLabel>
                    <FormControl><Input type="number" min={0} max={100} {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {sizingMode !== 'specint' && (
                  <FormField control={form.control} name="targetCpuUtilizationPercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        {cpuUtilLabel}
                        {cpuUtilTip && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent><p className="max-w-xs text-sm">{cpuUtilTip}</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </FormLabel>
                      <FormControl><Input type="number" min={1} max={100} {...numericField(field)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
                <FormField control={form.control} name="targetRamUtilizationPercent" render={({ field }) => (
                  <FormItem>
                    <FieldLabel name="targetRamUtilizationPercent">Target RAM Util %</FieldLabel>
                    <FormControl><Input type="number" min={1} max={100} {...numericField(field)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* HA Reserve — 3-way toggle */}
              <div className="mt-4">
                <Controller
                  control={form.control}
                  name="haReserveCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HA Reserve</FormLabel>
                      <div className="flex gap-0.5 border rounded-md p-0.5 bg-muted/40 w-fit">
                        {([0, 1, 2] as const).map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-pressed={field.value === n}
                            onClick={() => field.onChange(n)}
                            className={[
                              'px-3 py-1 text-sm rounded-sm transition-colors',
                              field.value === n
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'bg-transparent hover:bg-muted',
                            ].join(' ')}
                          >
                            {n === 0 ? 'N (None)' : `N+${n}`}
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* GHz mode — target CPU frequency */}
            {sizingMode === 'ghz' && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  GHz Mode (required)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="targetCpuFrequencyGhz" render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="targetCpuFrequencyGhz">Target CPU Frequency (GHz)</FieldLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.1}
                          step={0.1}
                          data-testid={`input-targetCpuFrequencyGhz-${scenarioId}`}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            )}

            {/* SPECrate2017 mode */}
            {sizingMode === 'specint' && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  SPECrate2017 Target (required in SPECrate mode)
                </p>
                <div className="space-y-3">
                  {/* Target CPU Model search input */}
                  <div className="space-y-1">
                    <Label htmlFor={`${scenarioId}-targetCpuModel`}>Target CPU Model</Label>
                    <Input
                      id={`${scenarioId}-targetCpuModel`}
                      type="text"
                      placeholder="e.g. Xeon Gold 6526Y"
                      value={targetCpuModel}
                      onChange={(e) => setTargetCpuModel(e.target.value)}
                    />
                  </div>

                  {/* SPEC results panel */}
                  {(debouncedCpuModel || specLookup.isLoading) && (
                    <SpecResultsPanel
                      results={specLookup.results}
                      status={specLookup.status}
                      isLoading={specLookup.isLoading}
                      onSelect={handleSpecSelect}
                      selectedScore={selectedTargetScore}
                    />
                  )}

                  {/* Manual targetSpecint input */}
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
              </div>
            )}

            {/* Optional advanced fields */}
            <div className="border-t pt-4 space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Advanced (optional)
              </p>

              {/* VM Count growth override */}
              <FormField control={form.control} name="targetVmCount" render={({ field }) => (
                <FormItem>
                  <FieldLabel name="targetVmCount">Target VM Count</FieldLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      data-testid={`input-targetVmCount-${scenarioId}`}
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  {currentCluster.totalVms > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Current: {currentCluster.totalVms.toLocaleString()} VMs → vCPUs scaled proportionally
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              {/* Minimum server floor (pin) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`${scenarioId}-pin-enabled`}
                    checked={pinEnabled}
                    onCheckedChange={(checked) => {
                      setPinEnabled(checked)
                      if (!checked) form.setValue('minServerCount', undefined)
                    }}
                  />
                  <Label htmlFor={`${scenarioId}-pin-enabled`} className="flex items-center gap-1 cursor-pointer text-sm">
                    Pin minimum servers
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-sm">{TOOLTIPS.minServerCount}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
                {pinEnabled && (
                  <FormField control={form.control} name="minServerCount" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="Minimum server count"
                          data-testid={`input-minServerCount-${scenarioId}`}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>
            </div>

            <VsanGrowthSection
              form={form}
              scenarioId={scenarioId}
              layoutMode={layoutMode}
              open={vsanGrowthOpen}
              onToggle={() => setVsanGrowthOpen((o) => !o)}
            />
          </CardContent>
        </form>
      </Form>
    </Card>
  )
}
