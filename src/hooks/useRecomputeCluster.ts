import { useEffect } from 'react'
import { useExclusionsStore } from '@/store/useExclusionsStore'
import { useImportStore } from '@/store/useImportStore'

export function useRecomputeCluster(): void {
  useEffect(() => {
    return useExclusionsStore.subscribe(() => {
      useImportStore.getState().recomputeCluster()
    })
  }, [])
}
