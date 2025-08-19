import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AppKitProvider } from './components/providers/AppKitProvider'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { BetaGate } from './components/beta/BetaGate'

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary showDetails={!import.meta.env.PROD}>
    <AppKitProvider>
      <BetaGate>
        <App />
      </BetaGate>
    </AppKitProvider>
  </ErrorBoundary>
);
