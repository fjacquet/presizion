import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Info, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { SpecResultsPanel } from '@/components/common/SpecResultsPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSpecLookup } from '@/hooks/useSpecLookup';
import type { SpecResult } from '@/lib/utils/specLookup';
import { type ScenarioInput, scenarioSchema } from '@/schemas/scenarioSchema';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import { useWizardStore } from '@/store/useWizardStore';
import type { Scenario } from '@/types/cluster';
import { VsanSection } from './VsanSection';

function FieldLabel({ name, children }: { name: keyof ScenarioInput; children: React.ReactNode }) {
  const { t } = useTranslation('step2');

  const TOOLTIPS: Partial<Record<keyof ScenarioInput, string>> = {
    socketsPerServer: t('scenarioCard.tooltips.socketsPerServer'),
    coresPerSocket: t('scenarioCard.tooltips.coresPerSocket'),
    ramPerServerGb: t('scenarioCard.tooltips.ramPerServerGb'),
    diskPerServerGb: t('scenarioCard.tooltips.diskPerServerGb'),
    targetVcpuToPCoreRatio: t('scenarioCard.tooltips.targetVcpuToPCoreRatio'),
    ramPerVmGb: t('scenarioCard.tooltips.ramPerVmGb'),
    diskPerVmGb: t('scenarioCard.tooltips.diskPerVmGb'),
    growthPercent: t('scenarioCard.tooltips.growthPercent'),
    safetyPercent: t('scenarioCard.tooltips.safetyPercent'),
    targetSpecint: t('scenarioCard.tooltips.targetSpecint'),
    targetCpuFrequencyGhz: t('scenarioCard.tooltips.targetCpuFrequencyGhz'),
    minServerCount: t('scenarioCard.tooltips.minServerCount'),
  };

  const tip = TOOLTIPS[name];
  return (
    <FormLabel className="flex items-center gap-1">
      {children}
      {tip && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info
                className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 cursor-help"
                aria-label={`Info: ${String(children)}`}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">{tip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </FormLabel>
  );
}

interface ScenarioCardProps {
  scenarioId: string;
}

export function ScenarioCard({ scenarioId }: ScenarioCardProps) {
  const { t } = useTranslation('step2');
  const scenario = useScenariosStore((s) => s.scenarios.find((sc) => sc.id === scenarioId));
  const updateScenario = useScenariosStore((s) => s.updateScenario);
  const removeScenario = useScenariosStore((s) => s.removeScenario);
  const duplicateScenario = useScenariosStore((s) => s.duplicateScenario);
  const sizingMode = useWizardStore((s) => s.sizingMode);
  const layoutMode = useWizardStore((s) => s.layoutMode);
  const currentCluster = useClusterStore((s) => s.currentCluster);

  const [pinEnabled, setPinEnabled] = useState(() => !!scenario?.minServerCount);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [specEnabled, setSpecEnabled] = useState(() => !!scenario?.targetSpecint);

  // SPEC lookup: local UI state for target CPU model search (not persisted)
  const [targetCpuModel, setTargetCpuModel] = useState('');
  const [debouncedCpuModel, setDebouncedCpuModel] = useState<string | undefined>(undefined);
  const [selectedTargetScore, setSelectedTargetScore] = useState<number | undefined>(undefined);

  // Debounce targetCpuModel by 500ms
  useEffect(() => {
    if (!targetCpuModel.trim()) {
      setDebouncedCpuModel(undefined);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedCpuModel(targetCpuModel);
    }, 500);
    return () => clearTimeout(timer);
  }, [targetCpuModel]);

  const specActive = (sizingMode === 'performance' && specEnabled) || sizingMode === 'vcpu';
  const specLookup = useSpecLookup(specActive ? debouncedCpuModel : undefined);

  const form = useForm<ScenarioInput>({
    // biome-ignore lint/suspicious/noExplicitAny: zodResolver input/output type mismatch needs any
    resolver: zodResolver(scenarioSchema) as any,
    mode: 'onBlur',
    defaultValues: scenario as ScenarioInput,
  });

  // Fix I-1: clear stale SPEC state when leaving performance mode.
  // Must clear to undefined (not resetField, which restores the mount default
  // e.g. 337) because constraints.ts routes to SPEC whenever targetSpecint > 0,
  // regardless of the specEnabled checkbox. Matches the uncheck handler below.
  useEffect(() => {
    if (sizingMode !== 'performance') {
      setSpecEnabled(false);
      form.setValue('targetSpecint', undefined);
    }
  }, [sizingMode, form]);

  const handleSpecSelect = useCallback(
    (result: SpecResult) => {
      setSelectedTargetScore(result.baseResult);
      form.setValue('targetSpecint', result.baseResult, { shouldValidate: true });
      if (result.chips > 0 && result.cores > 0) {
        const coresPerSocket = Math.round(result.cores / result.chips);
        form.setValue('socketsPerServer', result.chips, { shouldValidate: true });
        form.setValue('coresPerSocket', coresPerSocket, { shouldValidate: true });
      }
    },
    [form],
  );

  const scenarioIdRef = useRef(scenarioId);
  scenarioIdRef.current = scenarioId;
  const updateScenarioRef = useRef(updateScenario);
  updateScenarioRef.current = updateScenario;

  useEffect(() => {
    const subscription = form.watch((values) => {
      const result = scenarioSchema.safeParse(values);
      if (result.success) {
        updateScenarioRef.current(scenarioIdRef.current, result.data as Partial<Scenario>);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Sync seeded fields from Zustand store → RHF form when they change externally (e.g. Step 1 → Next).
  // Use primitive deps so React only re-runs when VALUES change, preventing infinite loops:
  //   form.setValue → watch fires → updateScenario → same value in store → dep unchanged → no re-run ✓
  useEffect(() => {
    if (!scenario) return;
    const seededFields = [
      'socketsPerServer',
      'coresPerSocket',
      'ramPerServerGb',
      'ramPerVmGb',
      'diskPerVmGb',
    ] as const;
    seededFields.forEach((field) => {
      const storeVal = scenario[field];
      if (storeVal === undefined) return;
      if (Number(form.getValues(field)) !== storeVal) {
        form.setValue(field, storeVal as never, { shouldDirty: false, shouldValidate: false });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional primitive deps to avoid infinite loop (see comment above)
  }, [
    scenario?.socketsPerServer,
    scenario?.coresPerSocket,
    scenario?.ramPerServerGb,
    scenario?.ramPerVmGb,
    scenario?.diskPerVmGb,
    form,
    scenario,
  ]);

  // SPEC-06..08: In performance mode with SPEC scores, auto-derive socket/core
  // from cluster metadata (read-only)
  const hasMetadata =
    sizingMode === 'performance' &&
    specEnabled &&
    currentCluster.socketsPerServer != null &&
    currentCluster.coresPerSocket != null;

  const socketsVal = Number(form.watch('socketsPerServer')) || 0;
  const coresVal = Number(form.watch('coresPerSocket')) || 0;
  const totalCores = socketsVal > 0 && coresVal > 0 ? socketsVal * coresVal : null;

  function numericField(field: { onChange: (v: string) => void; [k: string]: unknown }) {
    return {
      ...field,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value),
    };
  }

  if (!scenario) return null;

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
                        placeholder={t('scenarioCard.namePlaceholder')}
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
                size="icon"
                className="h-9 w-9"
                onClick={() => duplicateScenario(scenarioId)}
                aria-label={t('scenarioCard.duplicateAriaLabel')}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => removeScenario(scenarioId)}
                aria-label={t('scenarioCard.removeAriaLabel')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {currentCluster.totalVms > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 border-l-2 border-primary-600/40 dark:border-primary-500/40 pl-2">
                {t('scenarioCard.seededNotice', {
                  ratio: scenario.targetVcpuToPCoreRatio,
                  growth: scenario.growthPercent,
                  safety: scenario.safetyPercent,
                })}
              </p>
            )}

            {/* Server Configuration */}
            <section>
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                {t('scenarioCard.serverConfig.heading')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="socketsPerServer"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="socketsPerServer">
                        {t('scenarioCard.serverConfig.socketsPerServer')}
                      </FieldLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={hasMetadata}
                          {...numericField(field)}
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
                      <FieldLabel name="coresPerSocket">
                        {t('scenarioCard.serverConfig.coresPerSocket')}
                      </FieldLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={hasMetadata}
                          {...numericField(field)}
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
                      <FieldLabel name="ramPerServerGb">
                        {t('scenarioCard.serverConfig.ramPerServerGb')}
                      </FieldLabel>
                      <FormControl>
                        <Input type="number" min={1} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {layoutMode !== 'disaggregated' && (
                  <FormField
                    control={form.control}
                    name="diskPerServerGb"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel name="diskPerServerGb">
                          {t('scenarioCard.serverConfig.diskPerServerGb')}
                        </FieldLabel>
                        <FormControl>
                          <Input type="number" min={1} {...numericField(field)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
              {totalCores !== null && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                  {t('scenarioCard.serverConfig.totalCores')}{' '}
                  <span className="font-semibold tabular-nums">{totalCores}</span>
                </p>
              )}
              {sizingMode === 'performance' &&
                specEnabled &&
                (currentCluster.socketsPerServer == null ||
                  currentCluster.coresPerSocket == null) && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    {t('scenarioCard.serverConfig.noSocketCoreData')}
                  </p>
                )}
              {sizingMode === 'vcpu' && (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`${scenarioId}-vcpuTargetCpu`}>
                    {t('scenarioCard.serverConfig.lookupTargetCpu')}
                  </Label>
                  <Input
                    id={`${scenarioId}-vcpuTargetCpu`}
                    type="text"
                    placeholder={t('scenarioCard.serverConfig.cpuModelPlaceholder')}
                    value={targetCpuModel}
                    onChange={(e) => setTargetCpuModel(e.target.value)}
                  />
                  {(debouncedCpuModel || specLookup.isLoading) && (
                    <SpecResultsPanel
                      results={specLookup.results}
                      status={specLookup.status}
                      isLoading={specLookup.isLoading}
                      onSelect={(result) => {
                        setSelectedTargetScore(result.baseResult);
                        if (result.chips > 0 && result.cores > 0) {
                          const coresPerSocket = Math.round(result.cores / result.chips);
                          form.setValue('socketsPerServer', result.chips, { shouldValidate: true });
                          form.setValue('coresPerSocket', coresPerSocket, { shouldValidate: true });
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
              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                {t('scenarioCard.sizingAssumptions.heading')}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {sizingMode === 'vcpu' && (
                  <FormField
                    control={form.control}
                    name="targetVcpuToPCoreRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel name="targetVcpuToPCoreRatio">
                          {t('scenarioCard.sizingAssumptions.vcpuToPCoreRatio')}
                        </FieldLabel>
                        <FormControl>
                          <Input type="number" min={0.1} step={0.5} {...numericField(field)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="ramPerVmGb"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="ramPerVmGb">
                        {t('scenarioCard.sizingAssumptions.ramPerVmGb')}
                      </FieldLabel>
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
                      <FieldLabel name="diskPerVmGb">
                        {t('scenarioCard.sizingAssumptions.diskPerVmGb')}
                      </FieldLabel>
                      <FormControl>
                        <Input type="number" min={0.1} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="growthPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="growthPercent">
                        {t('scenarioCard.sizingAssumptions.growthPercent')}
                      </FieldLabel>
                      <FormControl>
                        <Input type="number" min={0} max={200} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="safetyPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel name="safetyPercent">
                        {t('scenarioCard.sizingAssumptions.safetyPercent')}
                      </FieldLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...numericField(field)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* HA Reserve — 3-way toggle */}
              <div className="mt-4">
                <Controller
                  control={form.control}
                  name="haReserveCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('scenarioCard.sizingAssumptions.haReserve')}</FormLabel>
                      <div className="flex gap-0.5 border border-slate-200 dark:border-surface-700 rounded-md p-0.5 bg-slate-100/40 dark:bg-surface-700/40 w-fit">
                        {([0, 1, 2] as const).map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-pressed={field.value === n}
                            onClick={() => field.onChange(n)}
                            className={[
                              'px-3 py-1 text-sm rounded-sm transition-colors',
                              field.value === n
                                ? 'bg-primary-600 text-white dark:bg-primary-500 font-semibold'
                                : 'bg-transparent hover:bg-slate-100 dark:hover:bg-surface-700',
                            ].join(' ')}
                          >
                            {n === 0 ? t('scenarioCard.sizingAssumptions.haNone') : `N+${n}`}
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </section>

            {/* Performance mode — GHz primary, SPEC optional */}
            {sizingMode === 'performance' && (
              <div className="border-t pt-4">
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  {t('scenarioCard.performance.heading')}
                </p>
                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="targetCpuFrequencyGhz"
                    render={({ field }) => (
                      <FormItem>
                        <FieldLabel name="targetCpuFrequencyGhz">
                          {t('scenarioCard.performance.targetCpuFrequencyGhz')}
                        </FieldLabel>
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
                    )}
                  />

                  {/* SPEC opt-in */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${scenarioId}-spec-enabled`}
                      checked={specEnabled}
                      onCheckedChange={(checked) => {
                        setSpecEnabled(checked);
                        if (!checked) form.setValue('targetSpecint', undefined);
                      }}
                    />
                    <Label
                      htmlFor={`${scenarioId}-spec-enabled`}
                      className="cursor-pointer text-sm"
                    >
                      {t('scenarioCard.performance.specScoresCheckbox')}
                    </Label>
                  </div>

                  {specEnabled && (
                    <div className="space-y-3">
                      {/* Target CPU Model search input */}
                      <div className="space-y-1">
                        <Label htmlFor={`${scenarioId}-targetCpuModel`}>
                          {t('scenarioCard.performance.targetCpuModel')}
                        </Label>
                        <Input
                          id={`${scenarioId}-targetCpuModel`}
                          type="text"
                          placeholder={t('scenarioCard.serverConfig.cpuModelPlaceholder')}
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
                            <Label htmlFor={`${scenarioId}-targetSpecint`}>
                              {t('scenarioCard.performance.targetSpecint')}
                            </Label>
                            <Input
                              id={`${scenarioId}-targetSpecint`}
                              type="number"
                              min={1}
                              data-testid={`input-targetSpecint-${scenarioId}`}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) =>
                                field.onChange(e.target.value === '' ? '' : Number(e.target.value))
                              }
                            />
                            {fieldState.error && (
                              <p className="text-sm text-util-high">{fieldState.error.message}</p>
                            )}
                          </div>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Advanced disclosure */}
            <div className="border-t pt-4 space-y-4">
              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                aria-expanded={advancedOpen}
                aria-controls={`${scenarioId}-advanced`}
                className="flex w-full items-center gap-1 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
              >
                {t('scenarioCard.advanced.label')}
                <span aria-hidden="true">{advancedOpen ? '▾' : '▸'}</span>
              </button>

              {advancedOpen && (
                <div id={`${scenarioId}-advanced`} className="space-y-4">
                  {/* Minimum server floor (pin) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${scenarioId}-pin-enabled`}
                        checked={pinEnabled}
                        onCheckedChange={(checked) => {
                          setPinEnabled(checked);
                          if (!checked) form.setValue('minServerCount', undefined);
                        }}
                      />
                      <Label
                        htmlFor={`${scenarioId}-pin-enabled`}
                        className="flex items-center gap-1 cursor-pointer text-sm"
                      >
                        {t('scenarioCard.advanced.pinMinServers')}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <Info className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs text-sm">
                                {t('scenarioCard.tooltips.minServerCount')}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                    </div>
                    {pinEnabled && (
                      <FormField
                        control={form.control}
                        name="minServerCount"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                placeholder={t('scenarioCard.advanced.minServerCountPlaceholder')}
                                data-testid={`input-minServerCount-${scenarioId}`}
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <VsanSection form={form} scenarioId={scenarioId} layoutMode={layoutMode} />
                </div>
              )}
            </div>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
}
