import { create } from 'zustand';
import type { OldCluster } from '../types/cluster';

/**
 * Current cluster state slice.
 * Stores the existing cluster metrics entered in wizard Step 1.
 *
 * Note: OldCluster is imported from types (NOT from schemas — schemas are for form validation;
 * types are for pure data structures).
 */
interface ClusterStore {
  /** Existing cluster metrics — initialized to empty state */
  currentCluster: OldCluster;
  /** Replace the cluster with new metrics (e.g., after form submit + validation) */
  setCurrentCluster: (cluster: OldCluster) => void;
  /** Reset cluster to the empty initial state */
  resetCluster: () => void;
}

const EMPTY_CLUSTER: OldCluster = {
  totalVcpus: 0,
  totalPcores: 0,
  totalVms: 0,
};

export const useClusterStore = create<ClusterStore>((set) => ({
  currentCluster: EMPTY_CLUSTER,

  setCurrentCluster: (cluster) => set({ currentCluster: cluster }),

  resetCluster: () => set({ currentCluster: EMPTY_CLUSTER }),
}));
