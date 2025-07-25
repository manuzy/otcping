import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AppKitProvider } from './components/providers/AppKitProvider'

createRoot(document.getElementById("root")!).render(
  <AppKitProvider>
    <App />
  </AppKitProvider>
);
