import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { loadFromLocalStorage, saveToLocalStorage } from './lib/utils/persistence'
import { useClusterStore } from './store/useClusterStore'
import { useScenariosStore } from './store/useScenariosStore'
import { useWizardStore } from './store/useWizardStore'

// ─── Boot restore (synchronous, before React mounts) ─────────────────────────
// Hydrate stores from localStorage so the initial render already has restored
// state — no flash or empty-state flicker.
const saved = loadFromLocalStorage()
if (saved) {
  useClusterStore.getState().setCurrentCluster(saved.cluster)
  useScenariosStore.getState().setScenarios(saved.scenarios)
  useWizardStore.getState().setSizingMode(saved.sizingMode)
  useWizardStore.getState().setLayoutMode(saved.layoutMode)
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
  })
}

useClusterStore.subscribe(saveSession)
useScenariosStore.subscribe(saveSession)
useWizardStore.subscribe(saveSession)

// ─── React mount ──────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
