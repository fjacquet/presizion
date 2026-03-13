import { Dialog } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'
import type { AnyImportResult } from '@/lib/utils/import'

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

export function ImportPreviewModal({ result, open, onClose }: ImportPreviewModalProps) {
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster)
  const setScenarios = useScenariosStore((s) => s.setScenarios)

  const isJson = result.sourceFormat === 'presizion-json'

  const handleApply = () => {
    if (isJson) {
      setCurrentCluster({ ...result.cluster })
      setScenarios(result.scenarios)
    } else {
      setCurrentCluster({
        totalVcpus: result.totalVcpus,
        totalPcores: result.totalPcores ?? 0,
        totalVms: result.totalVms,
        totalDiskGb: result.totalDiskGb,
        ...(result.existingServerCount != null && { existingServerCount: result.existingServerCount }),
        ...(result.socketsPerServer != null && { socketsPerServer: result.socketsPerServer }),
        ...(result.coresPerSocket != null && { coresPerSocket: result.coresPerSocket }),
        ...(result.ramPerServerGb != null && { ramPerServerGb: result.ramPerServerGb }),
        ...(result.cpuUtilizationPercent != null && { cpuUtilizationPercent: result.cpuUtilizationPercent }),
        ...(result.ramUtilizationPercent != null && { ramUtilizationPercent: result.ramUtilizationPercent }),
      })
    }
    onClose()
  }

  const pcoresKnown = !isJson && result.totalPcores != null && result.totalPcores > 0

  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-lg p-6 w-full max-w-md space-y-4">
          <Dialog.Title className="text-lg font-semibold">Import Preview</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground">
            Review the extracted data before populating the form.
          </Dialog.Description>

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
                <p><span className="font-medium">VMs found:</span> {result.vmCount}</p>
                <p><span className="font-medium">Total vCPUs:</span> {result.totalVcpus}</p>
                <p><span className="font-medium">Total VMs:</span> {result.totalVms}</p>
                <p><span className="font-medium">Total Disk:</span> {result.totalDiskGb} GB</p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Avg RAM/VM (informational):</span>{' '}
                  {result.avgRamPerVmGb} GB
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
              {result.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
            </div>
          )}

          {!isJson && !pcoresKnown && (
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Total pCores could not be read from this file and must be
              entered manually before advancing to Step 2.
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
