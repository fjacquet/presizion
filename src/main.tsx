import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { toast } from 'sonner'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { loadFromLocalStorage, decodeSessionFromHash, saveToLocalStorage } from './lib/utils/persistence'
import { useClusterStore } from './store/useClusterStore'
import { useScenariosStore } from './store/useScenariosStore'
import { useWizardStore } from './store/useWizardStore'
import { useExclusionsStore } from './store/useExclusionsStore'

// ─── Boot restore (synchronous, before React mounts) ─────────────────────────
// Priority: URL hash (shared session) > localStorage (previous session).
// This ensures a shared URL always loads the sender's exact configuration.

// 1. Try URL hash first (PERS-03: hash takes priority)
const hashSession = decodeSessionFromHash(window.location.hash)

// 2. Fall back to localStorage (PERS-01)
const saved = hashSession ?? loadFromLocalStorage()

if (saved) {
  useClusterStore.getState().setCurrentCluster(saved.cluster)
  useScenariosStore.getState().setScenarios(saved.scenarios)
  useWizardStore.getState().setSizingMode(saved.sizingMode)
  useWizardStore.getState().setLayoutMode(saved.layoutMode)
  if (saved.exclusions) {
    useExclusionsStore.getState().setRules(saved.exclusions)
  }
  if (saved.truncated) {
    queueMicrotask(() => {
      toast.warning(
        'Some exclusion rules were trimmed from the shared URL due to size. Re-import the source file to reproduce exact per-VM selections.',
      )
    })
  }
}

// 3. Clear the URL hash after restoring so a subsequent refresh uses localStorage.
//    history.replaceState avoids triggering a page reload.
if (hashSession) {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

// ─── Auto-save subscribers ────────────────────────────────────────────────────
// Persist on every store change. Fires synchronously in the same tick as the
// state update; no debounce needed for small session payloads.
const saveSession = () => {
  saveToLocalStorage({
    cluster: useClusterStore.getState().currentCluster,
    scenarios: useScenariosStore.getState().scenarios,
    sizingMode: useWizardStore.getState().sizingMode,
    layoutMode: useWizardStore.getState().layoutMode,
    exclusions: useExclusionsStore.getState().rules,
  })
}

useClusterStore.subscribe(saveSession)
useScenariosStore.subscribe(saveSession)
useWizardStore.subscribe(saveSession)
useExclusionsStore.subscribe(saveSession)

// ─── React mount ──────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
