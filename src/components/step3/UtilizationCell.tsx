import { TableCell } from '@/components/ui/table'
import { utilizationClass } from '@/lib/utils/utilizationClass'

interface UtilizationCellProps {
  pct: number
  target?: number | undefined
}

export function UtilizationCell({ pct, target = 100 }: UtilizationCellProps) {
  return (
    <TableCell className={`text-center ${utilizationClass(pct)}`}>
      {pct > 100 ? `⚠ ${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`}
      {target < 100 && (
        <span className="text-xs text-muted-foreground ml-1">/ {target}%</span>
      )}
    </TableCell>
  )
}
