import { useMemo, useState } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'
import { useImportStore } from '@/store/useImportStore'
import { aggregateScopes } from '@/lib/utils/import/scopeAggregator'
import { useIsMobile } from '@/hooks/useIsMobile'
import { VmExclusionPanel } from '@/components/exclusions/VmExclusionPanel'
import type { AnyImportResult, ScopeData } from '@/lib/utils/import'

interface ImportPreviewModalProps {
  result: AnyImportResult
  open: boolean
  onClose: () => void
}

const FORMAT_LABELS: Record<AnyImportResult['sourceFormat'], string> = {
  rvtools: 'RVTools',
  'liveoptics-xlsx': 'LiveOptics (xlsx)',
  'liveoptics-csv': 'LiveOptics (csv)',
  'presizion-json': 'Presizion JSON export',
}

interface ScopeSelectorProps {
  detectedScopes: string[]
  scopeLabels: Record<string, string>
  selectedScopes: string[]
  onToggle: (key: string, checked: boolean) => void
  rawByScope?: Map<string, ScopeData> | undefined
}

function ScopeSelector({ detectedScopes, scopeLabels, selectedScopes, onToggle, rawByScope }: ScopeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Filter by cluster</p>
      <div className="space-y-1">
        {detectedScopes.map((key) => {
          const hostCount = rawByScope?.get(key)?.existingServerCount
          const label = scopeLabels[key] ?? key
          const displayLabel = hostCount != null ? `${label} (${hostCount} hosts)` : label
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
          )
        })}
      </div>
    </div>
  )
}

export function ImportPreviewModal({ result, open, onClose }: ImportPreviewModalProps) {
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster)
  const setScenarios = useScenariosStore((s) => s.setScenarios)
  const seedFromCluster = useScenariosStore((s) => s.seedFromCluster)
  const setImportBuffer = useImportStore((s) => s.setImportBuffer)

  const isMobile = useIsMobile()

  const isJson = result.sourceFormat === 'presizion-json'

  const isMultiScope =
    !isJson &&
    result.detectedScopes != null &&
    result.detectedScopes.length > 1

  const scopesFromResult = 'detectedScopes' in result ? (result.detectedScopes ?? []) : []

  // Track previous result to reset selection state when a new import arrives
  const [prevResult, setPrevResult] = useState<AnyImportResult>(result)
  const [selectedScopes, setSelectedScopes] = useState<string[]>(scopesFromResult)
  const [step, setStep] = useState<'scope' | 'exclusions'>('scope')
  const initialStretch = !isJson && result.isStretchCluster === true
  const [stretchConfirmed, setStretchConfirmed] = useState<boolean>(initialStretch)

  if (prevResult !== result) {
    setPrevResult(result)
    setSelectedScopes(scopesFromResult)
    setStep('scope')
    setStretchConfirmed(initialStretch)
  }

  const canShowExclusions =
    !isJson && 'vmRowsByScope' in result && result.vmRowsByScope != null

  const previewCluster: ScopeData =
    isMultiScope && 'rawByScope' in result && result.rawByScope != null
      ? aggregateScopes(result.rawByScope, selectedScopes)
      : (result as ScopeData)

  const handleToggle = (key: string, checked: boolean) => {
    setSelectedScopes((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)))
  }

  const handleApply = () => {
    if (isJson) {
      setCurrentCluster({ ...result.cluster })
      setScenarios(result.scenarios)
    } else {
      const cluster = {
        totalVcpus: previewCluster.totalVcpus,
        totalPcores: previewCluster.totalPcores ?? 0,
        totalVms: previewCluster.totalVms,
        totalDiskGb: previewCluster.totalDiskGb,
        avgRamPerVmGb: previewCluster.avgRamPerVmGb,
        ...(previewCluster.existingServerCount != null && { existingServerCount: previewCluster.existingServerCount }),
        ...(previewCluster.socketsPerServer != null && { socketsPerServer: previewCluster.socketsPerServer }),
        ...(previewCluster.coresPerSocket != null && { coresPerSocket: previewCluster.coresPerSocket }),
        ...(previewCluster.ramPerServerGb != null && { ramPerServerGb: previewCluster.ramPerServerGb }),
        ...(previewCluster.cpuUtilizationPercent != null && { cpuUtilizationPercent: previewCluster.cpuUtilizationPercent }),
        ...(previewCluster.ramUtilizationPercent != null && { ramUtilizationPercent: previewCluster.ramUtilizationPercent }),
        ...(previewCluster.cpuModel != null && { cpuModel: previewCluster.cpuModel }),
        ...(previewCluster.cpuFrequencyGhz != null && { cpuFrequencyGhz: previewCluster.cpuFrequencyGhz }),
        ...(stretchConfirmed && { isStretchCluster: true }),
      }
      setCurrentCluster(cluster)
      seedFromCluster(cluster)
      if (result.rawByScope != null && result.detectedScopes != null && result.scopeLabels != null) {
        setImportBuffer(
          result.rawByScope,
          result.scopeLabels,
          selectedScopes,
          'vmRowsByScope' in result ? result.vmRowsByScope : undefined,
        )
      }
    }
    onClose()
  }

  const exclusionRows = useMemo(() => {
    if (!canShowExclusions) return []
    const map = 'vmRowsByScope' in result ? result.vmRowsByScope : undefined
    if (map == null) return []
    const keys = selectedScopes.length > 0 ? selectedScopes : [...map.keys()]
    return keys.flatMap((k) => map.get(k) ?? [])
  }, [canShowExclusions, result, selectedScopes])

  const pcoresKnown = !isJson && result.totalPcores != null && result.totalPcores > 0

  const sharedContent = (
    <>
      {isMultiScope && 'scopeLabels' in result && result.scopeLabels != null && result.detectedScopes != null && (
        <ScopeSelector
          detectedScopes={result.detectedScopes}
          scopeLabels={result.scopeLabels}
          selectedScopes={selectedScopes}
          onToggle={handleToggle}
          rawByScope={'rawByScope' in result ? result.rawByScope ?? undefined : undefined}
        />
      )}

      {!isJson && (result.isStretchCluster === true || stretchConfirmed) && (
        <div className="flex items-start gap-2 p-2 rounded border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Stretch cluster detected</Badge>
              <Switch
                checked={stretchConfirmed}
                onCheckedChange={setStretchConfirmed}
                aria-label="Confirm stretch cluster topology"
              />
            </div>
            {result.stretchSignals && result.stretchSignals.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-0.5">
                {result.stretchSignals.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Sizing will double the server count for site symmetry.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1 text-sm">
        <p><span className="font-medium">Source:</span> {FORMAT_LABELS[result.sourceFormat]}</p>

        {isJson ? (
          <>
            <p><span className="font-medium">Total vCPUs:</span> {result.cluster.totalVcpus}</p>
            <p><span className="font-medium">Total pCores:</span> {result.cluster.totalPcores}</p>
            <p><span className="font-medium">Total VMs:</span> {result.cluster.totalVms}</p>
            {result.cluster.totalDiskGb != null && (
              <p><span className="font-medium">Total Disk:</span> {result.cluster.totalDiskGb} GB</p>
            )}
            <p><span className="font-medium">Scenarios:</span> {result.scenarios.length}</p>
          </>
        ) : (
          <>
            <p><span className="font-medium">VMs found:</span> {previewCluster.vmCount}</p>
            <p><span className="font-medium">Total vCPUs:</span> {previewCluster.totalVcpus}</p>
            <p><span className="font-medium">Total VMs:</span> {previewCluster.totalVms}</p>
            <p><span className="font-medium">Total Disk:</span> {previewCluster.totalDiskGb} GB</p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Avg RAM/VM (informational):</span>{' '}
              {previewCluster.avgRamPerVmGb} GB
            </p>
            {result.totalPcores != null && (
              <p><span className="font-medium">Total pCores:</span> {result.totalPcores}</p>
            )}
            {result.existingServerCount != null && (
              <p><span className="font-medium">Existing servers:</span> {result.existingServerCount}</p>
            )}
            {result.socketsPerServer != null && (
              <p><span className="font-medium">Sockets/server:</span> {result.socketsPerServer}</p>
            )}
            {result.coresPerSocket != null && (
              <p><span className="font-medium">Cores/socket:</span> {result.coresPerSocket}</p>
            )}
            {result.ramPerServerGb != null && (
              <p><span className="font-medium">RAM/server:</span> {result.ramPerServerGb} GB</p>
            )}
            {result.cpuUtilizationPercent != null && (
              <p><span className="font-medium">Avg CPU util:</span> {result.cpuUtilizationPercent}%</p>
            )}
            {result.ramUtilizationPercent != null && (
              <p><span className="font-medium">Avg RAM util:</span> {result.ramUtilizationPercent}%</p>
            )}
          </>
        )}
      </div>

      {'warnings' in result && result.warnings.length > 0 && (
        <div className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
          {result.warnings.map((w, i) => <p key={i}>&#x26A0; {w}</p>)}
        </div>
      )}

      {!isJson && !pcoresKnown && (
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> Total pCores could not be read from this file and must be
          entered manually before advancing to Step 2.
        </p>
      )}
    </>
  )

  const body = step === 'scope' ? sharedContent : <VmExclusionPanel rows={exclusionRows} />

  const footerButtons = (
    <>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      {step === 'scope' && canShowExclusions ? (
        <Button onClick={() => setStep('exclusions')}>Next</Button>
      ) : step === 'exclusions' ? (
        <>
          <Button variant="outline" onClick={() => setStep('scope')}>Back</Button>
          <Button onClick={handleApply}>Apply</Button>
        </>
      ) : (
        <Button onClick={handleApply}>Apply</Button>
      )}
    </>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => { if (!o) onClose() }}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Import Preview</DrawerTitle>
            <DrawerDescription>Review the extracted data before populating the form.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-2 overflow-y-auto space-y-4">
            {body}
          </div>
          <DrawerFooter>{footerButtons}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-lg p-6 w-full max-w-md space-y-4">
          <Dialog.Title className="text-lg font-semibold">Import Preview</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Review the extracted data before populating the form.
          </Dialog.Description>

          {body}

          <div className="flex gap-3 justify-end">{footerButtons}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
