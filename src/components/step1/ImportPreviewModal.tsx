import { Dialog } from '@base-ui/react/dialog';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VmExclusionPanel } from '@/components/exclusions/VmExclusionPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/useIsMobile';
import type { AnyImportResult, ScopeData } from '@/lib/utils/import';
import { aggregateScopes } from '@/lib/utils/import/scopeAggregator';
import { useClusterStore } from '@/store/useClusterStore';
import { useImportStore } from '@/store/useImportStore';
import { useScenariosStore } from '@/store/useScenariosStore';

interface ImportPreviewModalProps {
  result: AnyImportResult;
  open: boolean;
  onClose: () => void;
}

const FORMAT_LABELS: Record<AnyImportResult['sourceFormat'], string> = {
  rvtools: 'RVTools',
  'liveoptics-xlsx': 'LiveOptics (xlsx)',
  'liveoptics-csv': 'LiveOptics (csv)',
  'presizion-json': 'Presizion JSON export',
};

interface ScopeSelectorProps {
  detectedScopes: string[];
  scopeLabels: Record<string, string>;
  selectedScopes: string[];
  onToggle: (key: string, checked: boolean) => void;
  rawByScope?: Map<string, ScopeData> | undefined;
  filterLabel: string;
}

function ScopeSelector({
  detectedScopes,
  scopeLabels,
  selectedScopes,
  onToggle,
  rawByScope,
  filterLabel,
}: ScopeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{filterLabel}</p>
      <div className="space-y-1">
        {detectedScopes.map((key) => {
          const hostCount = rawByScope?.get(key)?.existingServerCount;
          const label = scopeLabels[key] ?? key;
          const displayLabel = hostCount != null ? `${label} (${hostCount} hosts)` : label;
          return (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`scope-${key}`}
                checked={selectedScopes.includes(key)}
                onCheckedChange={(checked) => onToggle(key, checked)}
              />
              <label htmlFor={`scope-${key}`} className="text-sm cursor-pointer">
                {displayLabel}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ImportPreviewModal({ result, open, onClose }: ImportPreviewModalProps) {
  const { t } = useTranslation('step1');
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster);
  const setScenarios = useScenariosStore((s) => s.setScenarios);
  const seedFromCluster = useScenariosStore((s) => s.seedFromCluster);
  const setImportBuffer = useImportStore((s) => s.setImportBuffer);

  const isMobile = useIsMobile();

  const isJson = result.sourceFormat === 'presizion-json';

  const isMultiScope = !isJson && result.detectedScopes != null && result.detectedScopes.length > 1;

  const scopesFromResult = 'detectedScopes' in result ? (result.detectedScopes ?? []) : [];

  // Track previous result to reset selection state when a new import arrives
  const [prevResult, setPrevResult] = useState<AnyImportResult>(result);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(scopesFromResult);
  const [step, setStep] = useState<'scope' | 'exclusions'>('scope');
  const initialStretch = !isJson && result.isStretchCluster === true;
  const [stretchConfirmed, setStretchConfirmed] = useState<boolean>(initialStretch);

  if (prevResult !== result) {
    setPrevResult(result);
    setSelectedScopes(scopesFromResult);
    setStep('scope');
    setStretchConfirmed(initialStretch);
  }

  const canShowExclusions = !isJson && 'vmRowsByScope' in result && result.vmRowsByScope != null;

  const previewCluster: ScopeData =
    isMultiScope && 'rawByScope' in result && result.rawByScope != null
      ? aggregateScopes(result.rawByScope, selectedScopes)
      : (result as ScopeData);

  const handleToggle = (key: string, checked: boolean) => {
    setSelectedScopes((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const handleApply = () => {
    if (isJson) {
      setCurrentCluster({ ...result.cluster });
      setScenarios(result.scenarios);
    } else {
      const cluster = {
        totalVcpus: previewCluster.totalVcpus,
        totalPcores: previewCluster.totalPcores ?? 0,
        totalVms: previewCluster.totalVms,
        totalDiskGb: previewCluster.totalDiskGb,
        avgRamPerVmGb: previewCluster.avgRamPerVmGb,
        ...(previewCluster.existingServerCount != null && {
          existingServerCount: previewCluster.existingServerCount,
        }),
        ...(previewCluster.socketsPerServer != null && {
          socketsPerServer: previewCluster.socketsPerServer,
        }),
        ...(previewCluster.coresPerSocket != null && {
          coresPerSocket: previewCluster.coresPerSocket,
        }),
        ...(previewCluster.ramPerServerGb != null && {
          ramPerServerGb: previewCluster.ramPerServerGb,
        }),
        ...(previewCluster.cpuUtilizationPercent != null && {
          cpuUtilizationPercent: previewCluster.cpuUtilizationPercent,
        }),
        ...(previewCluster.ramUtilizationPercent != null && {
          ramUtilizationPercent: previewCluster.ramUtilizationPercent,
        }),
        ...(previewCluster.cpuModel != null && { cpuModel: previewCluster.cpuModel }),
        ...(previewCluster.cpuFrequencyGhz != null && {
          cpuFrequencyGhz: previewCluster.cpuFrequencyGhz,
        }),
        ...(previewCluster.isStretchCluster === true &&
          stretchConfirmed && { isStretchCluster: true }),
      };
      setCurrentCluster(cluster);
      seedFromCluster(cluster);
      if (
        result.rawByScope != null &&
        result.detectedScopes != null &&
        result.scopeLabels != null
      ) {
        setImportBuffer(
          result.rawByScope,
          result.scopeLabels,
          selectedScopes,
          'vmRowsByScope' in result ? result.vmRowsByScope : undefined,
        );
      }
    }
    onClose();
  };

  const exclusionRows = useMemo(() => {
    if (!canShowExclusions) return [];
    const map = 'vmRowsByScope' in result ? result.vmRowsByScope : undefined;
    if (map == null) return [];
    const keys = selectedScopes.length > 0 ? selectedScopes : [...map.keys()];
    return keys.flatMap((k) => map.get(k) ?? []);
  }, [canShowExclusions, result, selectedScopes]);

  const pcoresKnown = !isJson && result.totalPcores != null && result.totalPcores > 0;

  const sharedContent = (
    <>
      {isMultiScope &&
        'scopeLabels' in result &&
        result.scopeLabels != null &&
        result.detectedScopes != null && (
          <ScopeSelector
            detectedScopes={result.detectedScopes}
            scopeLabels={result.scopeLabels}
            selectedScopes={selectedScopes}
            onToggle={handleToggle}
            rawByScope={'rawByScope' in result ? (result.rawByScope ?? undefined) : undefined}
            filterLabel={t('importPreview.filterByCluster')}
          />
        )}

      {!isJson && previewCluster.isStretchCluster === true && (
        <div className="flex items-start gap-2 p-2 rounded border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t('importPreview.stretchDetected')}</Badge>
              <Switch
                checked={stretchConfirmed}
                onCheckedChange={setStretchConfirmed}
                aria-label={t('importPreview.confirmStretchAriaLabel')}
              />
            </div>
            {previewCluster.stretchSignals && previewCluster.stretchSignals.length > 0 && (
              <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc list-inside space-y-0.5">
                {previewCluster.stretchSignals.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('importPreview.stretchSizingNote')}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">{t('importPreview.source')}:</span>{' '}
          {FORMAT_LABELS[result.sourceFormat]}
        </p>

        {isJson ? (
          <>
            <p>
              <span className="font-medium">{t('importPreview.totalVcpus')}:</span>{' '}
              {result.cluster.totalVcpus}
            </p>
            <p>
              <span className="font-medium">{t('importPreview.totalPcores')}:</span>{' '}
              {result.cluster.totalPcores}
            </p>
            <p>
              <span className="font-medium">{t('importPreview.totalVms')}:</span>{' '}
              {result.cluster.totalVms}
            </p>
            {result.cluster.totalDiskGb != null && (
              <p>
                <span className="font-medium">{t('importPreview.totalDisk')}:</span>{' '}
                {result.cluster.totalDiskGb} GB
              </p>
            )}
            <p>
              <span className="font-medium">{t('importPreview.scenarios')}:</span>{' '}
              {result.scenarios.length}
            </p>
          </>
        ) : (
          <>
            <p>
              <span className="font-medium">{t('importPreview.vmsFound')}:</span>{' '}
              {previewCluster.vmCount}
            </p>
            <p>
              <span className="font-medium">{t('importPreview.totalVcpus')}:</span>{' '}
              {previewCluster.totalVcpus}
            </p>
            <p>
              <span className="font-medium">{t('importPreview.totalVms')}:</span>{' '}
              {previewCluster.totalVms}
            </p>
            <p>
              <span className="font-medium">{t('importPreview.totalDisk')}:</span>{' '}
              {previewCluster.totalDiskGb} GB
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {t('importPreview.avgRamPerVm')}:
              </span>{' '}
              {previewCluster.avgRamPerVmGb} GB
            </p>
            {result.totalPcores != null && (
              <p>
                <span className="font-medium">{t('importPreview.totalPcores')}:</span>{' '}
                {result.totalPcores}
              </p>
            )}
            {result.existingServerCount != null && (
              <p>
                <span className="font-medium">{t('importPreview.existingServers')}:</span>{' '}
                {result.existingServerCount}
              </p>
            )}
            {result.socketsPerServer != null && (
              <p>
                <span className="font-medium">{t('importPreview.socketsPerServer')}:</span>{' '}
                {result.socketsPerServer}
              </p>
            )}
            {result.coresPerSocket != null && (
              <p>
                <span className="font-medium">{t('importPreview.coresPerSocket')}:</span>{' '}
                {result.coresPerSocket}
              </p>
            )}
            {result.ramPerServerGb != null && (
              <p>
                <span className="font-medium">{t('importPreview.ramPerServer')}:</span>{' '}
                {result.ramPerServerGb} GB
              </p>
            )}
            {result.cpuUtilizationPercent != null && (
              <p>
                <span className="font-medium">{t('importPreview.avgCpuUtil')}:</span>{' '}
                {result.cpuUtilizationPercent}%
              </p>
            )}
            {result.ramUtilizationPercent != null && (
              <p>
                <span className="font-medium">{t('importPreview.avgRamUtil')}:</span>{' '}
                {result.ramUtilizationPercent}%
              </p>
            )}
          </>
        )}
      </div>

      {'warnings' in result && result.warnings.length > 0 && (
        <div className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
          {result.warnings.map((w, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static warning list, never reordered
            <p key={i}>&#x26A0; {w}</p>
          ))}
        </div>
      )}

      {!isJson && !pcoresKnown && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <strong>{t('importPreview.noteLabel')}</strong> {t('importPreview.noPcoresNote')}
        </p>
      )}
    </>
  );

  const body = step === 'scope' ? sharedContent : <VmExclusionPanel rows={exclusionRows} />;

  const footerButtons = (
    <>
      <Button variant="outline" onClick={onClose}>
        {t('importPreview.cancelButton')}
      </Button>
      {step === 'scope' && canShowExclusions ? (
        <Button onClick={() => setStep('exclusions')}>{t('importPreview.nextButton')}</Button>
      ) : step === 'exclusions' ? (
        <>
          <Button variant="outline" onClick={() => setStep('scope')}>
            {t('importPreview.backButton')}
          </Button>
          <Button onClick={handleApply}>{t('importPreview.applyButton')}</Button>
        </>
      ) : (
        <Button onClick={handleApply}>{t('importPreview.applyButton')}</Button>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(o) => {
          if (!o) onClose();
        }}
      >
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>{t('importPreview.title')}</DrawerTitle>
            <DrawerDescription>{t('importPreview.description')}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 overflow-y-auto space-y-4">{body}</div>
          <DrawerFooter>{footerButtons}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-surface-900 border border-slate-200 dark:border-surface-700 rounded-lg shadow-lg p-6 w-full max-w-md space-y-4">
          <Dialog.Title className="text-lg font-semibold">{t('importPreview.title')}</Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 dark:text-slate-400">
            {t('importPreview.description')}
          </Dialog.Description>

          {body}

          <div className="flex gap-3 justify-end">{footerButtons}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
