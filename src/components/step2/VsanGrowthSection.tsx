import { Controller, type UseFormReturn } from 'react-hook-form'
import { ChevronDown } from 'lucide-react'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { ScenarioInput } from '@/schemas/scenarioSchema'
import type { LayoutMode } from '@/store/useWizardStore'
import {
  FTT_POLICY_MAP,
  COMPRESSION_FACTOR_LABELS,
  type VsanFttPolicy,
} from '@/lib/sizing/vsanConstants'
import {
  VSAN_DEFAULT_SLACK_PERCENT,
  VSAN_DEFAULT_CPU_OVERHEAD_PCT,
  VSAN_DEFAULT_MEMORY_PER_HOST_GB,
} from '@/lib/sizing/defaults'

interface VsanGrowthSectionProps {
  form: UseFormReturn<ScenarioInput>
  scenarioId: string
  layoutMode: LayoutMode
  open: boolean
  onToggle: () => void
}

const selectClasses =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

export function VsanGrowthSection({
  form,
  scenarioId,
  layoutMode,
  open,
  onToggle,
}: VsanGrowthSectionProps) {
  const sectionId = `vsan-growth-${scenarioId}`

  return (
    <div className="border-t pt-4 space-y-4">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={sectionId}
        className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground uppercase tracking-wide"
      >
        vSAN & Growth
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div id={sectionId} className="space-y-4">
          {/* vSAN sub-section — HCI only (FORM-04) */}
          {layoutMode === 'hci' && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground">vSAN Settings</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* FTT Policy dropdown */}
                <Controller
                  control={form.control}
                  name="vsanFttPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FTT Policy</FormLabel>
                      <FormControl>
                        <select
                          className={selectClasses}
                          data-testid={`select-vsanFttPolicy-${scenarioId}`}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <option value="">None (legacy sizing)</option>
                          {(Object.keys(FTT_POLICY_MAP) as VsanFttPolicy[]).map(
                            (key) => (
                              <option key={key} value={key}>
                                {FTT_POLICY_MAP[key].label}
                              </option>
                            ),
                          )}
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Compression Factor dropdown */}
                <Controller
                  control={form.control}
                  name="vsanCompressionFactor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compression Factor</FormLabel>
                      <FormControl>
                        <select
                          className={selectClasses}
                          data-testid={`select-vsanCompressionFactor-${scenarioId}`}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <option value="">None (1.0x)</option>
                          {(
                            Object.entries(COMPRESSION_FACTOR_LABELS) as [
                              string,
                              string,
                            ][]
                          ).map(([key, label]) => (
                            <option
                              key={key}
                              value={key}
                            >
                              {label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Slack Space % */}
                <FormField
                  control={form.control}
                  name="vsanSlackPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slack Space %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder={String(VSAN_DEFAULT_SLACK_PERCENT)}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* vSAN CPU Overhead % */}
                <FormField
                  control={form.control}
                  name="vsanCpuOverheadPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPU Overhead %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder={String(VSAN_DEFAULT_CPU_OVERHEAD_PCT)}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* vSAN Memory/Host GB */}
                <FormField
                  control={form.control}
                  name="vsanMemoryPerHostGb"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Memory/Host GB</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder={String(VSAN_DEFAULT_MEMORY_PER_HOST_GB)}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* VM Swap toggle — own row */}
              <Controller
                control={form.control}
                name="vsanVmSwapEnabled"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={field.value ?? false}
                      onCheckedChange={(checked) => field.onChange(checked)}
                      id={`${scenarioId}-vmSwap`}
                    />
                    <Label htmlFor={`${scenarioId}-vmSwap`} className="cursor-pointer text-sm">
                      VM Swap on vSAN
                    </Label>
                  </div>
                )}
              />
            </div>
          )}

          {/* Growth sub-section — always visible (FORM-03) */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Growth Projections</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cpuGrowthPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPU Growth %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="memoryGrowthPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memory Growth %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="storageGrowthPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Growth %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        placeholder="0"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
