import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'

// Get projectId from your environment or use a temporary prompt
const getProjectId = () => {
  // In production, this should come from your environment
  const projectId = prompt('Enter your Reown Project ID from https://dashboard.reown.com:') || '';
  if (!projectId) {
    throw new Error('Project ID is required');
  }
  return projectId;
};

const projectId = getProjectId();

// Metadata for your app
const metadata = {
  name: 'OTC Trades',
  description: 'Secure OTC cryptocurrency trading platform',
  url: window.location.origin,
  icons: [`${window.location.origin}/favicon.ico`]
}

// Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet],
  projectId,
  ssr: true
})

// Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet],
  projectId,
  metadata,
  features: {
    analytics: true
  }
})

export { wagmiAdapter }