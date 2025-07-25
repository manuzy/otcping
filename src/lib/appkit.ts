import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'

// Replace with your actual Reown Project ID from https://dashboard.reown.com
const projectId = 'YOUR_PROJECT_ID_HERE' // TODO: Replace this with your actual project ID

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