import { useState, useMemo } from 'react'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import { useImportStore } from '@/store/useImportStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@base-ui/react/dialog'
import { VmExclusionPanel } from './VmExclusionPanel'

export function ExclusionSummaryCard() {
  const rules = useExclusionsStore((s) => s.rules)
  const vmRowsByScope = useImportStore((s) => s.vmRowsByScope)
  const activeScope = useImportStore((s) => s.activeScope)
  const [open, setOpen] = useState(false)

  const hasAnyRule =
    rules.namePattern !== '' ||
    rules.exactNames.length > 0 ||
    rules.excludePoweredOff ||
    rules.manuallyExcluded.length > 0 ||
    rules.manuallyIncluded.length > 0

  const activeRows = useMemo(() => {
    if (vmRowsByScope == null) return null
    const scopes = activeScope.length > 0 ? activeScope : [...vmRowsByScope.keys()]
    return scopes.flatMap((k) => vmRowsByScope.get(k) ?? [])
  }, [vmRowsByScope, activeScope])

  if (!hasAnyRule && activeRows == null) return null

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">VM Exclusions</h3>
        {activeRows != null ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Edit exclusions
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Re-import source file to edit</span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {rules.namePattern && <Badge variant="outline">Pattern: {rules.namePattern}</Badge>}
        {rules.exactNames.length > 0 && (
          <Badge variant="outline">Exact names: {rules.exactNames.length}</Badge>
        )}
        {rules.excludePoweredOff && <Badge variant="outline">Powered-off</Badge>}
        {rules.manuallyExcluded.length > 0 && (
          <Badge variant="outline">Manual excludes: {rules.manuallyExcluded.length}</Badge>
        )}
        {rules.manuallyIncluded.length > 0 && (
          <Badge variant="outline">Manual keeps: {rules.manuallyIncluded.length}</Badge>
        )}
      </div>
      {open && activeRows != null && (
        <Dialog.Root open={open} onOpenChange={(o) => { if (!o) setOpen(false) }}>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40" />
            <Dialog.Popup className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border rounded-lg shadow-lg p-6 w-full max-w-lg">
              <Dialog.Title className="text-lg font-semibold mb-2">Edit VM Exclusions</Dialog.Title>
              <VmExclusionPanel rows={activeRows} />
              <div className="flex justify-end mt-3">
                <Button onClick={() => setOpen(false)}>Close</Button>
              </div>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  )
}
