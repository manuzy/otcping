import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AppKitProvider } from './components/providers/AppKitProvider'
import { ErrorBoundary } from './components/error/ErrorBoundary'
import { GlobalSearchProvider } from '@/components/search/GlobalSearchProvider'

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary showDetails={!import.meta.env.PROD}>
    <AppKitProvider>
      <GlobalSearchProvider>
        <App />
      </GlobalSearchProvider>
    </AppKitProvider>
  </ErrorBoundary>
);
