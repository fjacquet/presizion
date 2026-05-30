/**
 * ComparisonTable — Step 3 side-by-side scenario comparison
 * Requirements: COMP-01, COMP-02, UX-04
 *
 * Orientation: metrics = rows, scenarios = columns.
 * Two logical groups: per-node sizing parameters, then cluster totals.
 */

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useScenariosResults } from '@/hooks/useScenariosResults';
import { useClusterStore } from '@/store/useClusterStore';
import { useScenariosStore } from '@/store/useScenariosStore';
import type { SizingMode } from '@/store/useWizardStore';
import { useWizardStore } from '@/store/useWizardStore';
import { ClusterTotalRows } from './ClusterTotalRows';
import { NodeSizingRows } from './NodeSizingRows';
import { UtilizationRows } from './UtilizationRows';

const MODE_LABELS: Record<SizingMode, string> = {
  vcpu: 'vCPU',
  performance: 'Performance',
};

export function ComparisonTable() {
  const scenarios = useScenariosStore((state) => state.scenarios);
  const results = useScenariosResults();
  const currentCluster = useClusterStore((state) => state.currentCluster);
  const sizingMode = useWizardStore((s) => s.sizingMode);
  const layoutMode = useWizardStore((s) => s.layoutMode);

  return (
    <div className="space-y-3">
      {/* Metadata chips */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-muted-foreground">Mode:</span>
        <Badge variant="outline">{MODE_LABELS[sizingMode]}</Badge>
        <span className="text-muted-foreground ml-2">Layout:</span>
        <Badge variant="outline">{layoutMode === 'hci' ? 'HCI' : 'Disaggregated'}</Badge>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead className="w-48 font-semibold sticky left-0 bg-background z-10">
                Metric
              </TableHead>
              <TableHead className="font-semibold text-center bg-muted/30">As-Is</TableHead>
              {scenarios.map((scenario) => (
                <TableHead key={scenario.id} className="font-semibold text-center">
                  {scenario.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <NodeSizingRows
              cluster={currentCluster}
              scenarios={scenarios}
              results={results}
              sizingMode={sizingMode}
            />
            <UtilizationRows
              cluster={currentCluster}
              scenarios={scenarios}
              results={results}
              sizingMode={sizingMode}
              layoutMode={layoutMode}
            />
            <ClusterTotalRows
              cluster={currentCluster}
              scenarios={scenarios}
              results={results}
              layoutMode={layoutMode}
            />
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
