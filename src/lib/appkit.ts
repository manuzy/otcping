import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet } from '@reown/appkit/networks'

// Replace with your actual Reown Project ID from https://dashboard.reown.com
const projectId = '8091c0243978a61f761f5c2a82ad83d8'

// Metadata for your app
const metadata = {
  name: 'OTCping',
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