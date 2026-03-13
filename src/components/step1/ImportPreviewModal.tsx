import { Dialog } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'
import { useClusterStore } from '@/store/useClusterStore'
import type { ClusterImportResult } from '@/lib/utils/import'

interface ImportPreviewModalProps {
  result: ClusterImportResult
  open: boolean
  onClose: () => void
}

const FORMAT_LABELS: Record<ClusterImportResult['sourceFormat'], string> = {
  rvtools: 'RVTools',
  'liveoptics-xlsx': 'LiveOptics (xlsx)',
  'liveoptics-csv': 'LiveOptics (csv)',
}

export function ImportPreviewModal({ result, open, onClose }: ImportPreviewModalProps) {
  const setCurrentCluster = useClusterStore((s) => s.setCurrentCluster)

  const handleApply = () => {
    setCurrentCluster({
      totalVcpus: result.totalVcpus,
      totalPcores: 0,
      totalVms: result.totalVms,
      totalDiskGb: result.totalDiskGb,
    })
    onClose()
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

          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Source:</span> {FORMAT_LABELS[result.sourceFormat]}</p>
            <p><span className="font-medium">VMs found:</span> {result.vmCount}</p>
            <p><span className="font-medium">Total vCPUs:</span> {result.totalVcpus}</p>
            <p><span className="font-medium">Total VMs:</span> {result.totalVms}</p>
            <p><span className="font-medium">Total Disk:</span> {result.totalDiskGb} GB</p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Avg RAM/VM (informational):</span>{' '}
              {result.avgRamPerVmGb} GB — not auto-populated
            </p>
          </div>

          {result.warnings.length > 0 && (
            <div className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
              {result.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Total pCores is not available in this export format and must be
            entered manually before advancing to Step 2.
          </p>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
