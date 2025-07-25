import { SignClient } from '@walletconnect/sign-client';
import { WalletConnectModal } from '@walletconnect/modal';

interface WalletConnectConfig {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
  };
}

class WalletConnectService {
  private signClient: InstanceType<typeof SignClient> | null = null;
  private modal: WalletConnectModal | null = null;
  private config: WalletConnectConfig;

  constructor(config: WalletConnectConfig) {
    this.config = config;
  }

  async initialize() {
    try {
      console.log('Initializing WalletConnect with projectId:', this.config.projectId);
      
      if (!this.config.projectId || this.config.projectId === '8091c0243978a61f761f5c2a82ad83d8') {
        throw new Error('Invalid or default WalletConnect Project ID. Please get a valid Project ID from https://cloud.walletconnect.com');
      }

      this.signClient = await SignClient.init({
        projectId: this.config.projectId,
        metadata: this.config.metadata,
      });

      console.log('SignClient initialized successfully');

      this.modal = new WalletConnectModal({
        projectId: this.config.projectId,
        chains: ['eip155:1', 'eip155:137'], // Ethereum and Polygon
      });

      console.log('WalletConnect Modal initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Project not found') || error.message.includes('3000')) {
          console.error('Project ID is invalid. Please check your WalletConnect Cloud project ID.');
        }
      }
      
      return false;
    }
  }

  async connect(): Promise<{ address: string; chainId: number } | null> {
    if (!this.signClient || !this.modal) {
      throw new Error('WalletConnect not initialized');
    }

    try {
      const { uri, approval } = await this.signClient.connect({
        requiredNamespaces: {
          eip155: {
            methods: ['eth_sendTransaction', 'personal_sign', 'eth_sign'],
            chains: ['eip155:1', 'eip155:137'],
            events: ['accountsChanged', 'chainChanged'],
          },
        },
      });

      if (uri) {
        this.modal.openModal({ uri });
        const session = await approval();
        this.modal.closeModal();

        const accounts = session.namespaces.eip155?.accounts || [];
        if (accounts.length > 0) {
          const accountData = accounts[0].split(':');
          const chainId = parseInt(accountData[1]);
          const address = accountData[2];
          
          return { address, chainId };
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      this.modal?.closeModal();
      return null;
    }
  }

  async signMessage(message: string, address: string): Promise<string | null> {
    if (!this.signClient) {
      throw new Error('WalletConnect not initialized');
    }

    try {
      const sessions = this.signClient.session.getAll();
      const session = sessions.find(s => 
        s.namespaces.eip155?.accounts.some(acc => acc.includes(address))
      );

      if (!session) {
        throw new Error('No active session found for this address');
      }

      const result = await this.signClient.request({
        topic: session.topic,
        chainId: 'eip155:1',
        request: {
          method: 'personal_sign',
          params: [message, address],
        },
      });

      return result as string;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }

  async disconnect() {
    if (this.signClient) {
      const sessions = this.signClient.session.getAll();
      await Promise.all(
        sessions.map(session =>
          this.signClient?.disconnect({
            topic: session.topic,
            reason: {
              code: 6000,
              message: 'User disconnected',
            },
          })
        )
      );
    }
  }

  getActiveSessions() {
    return this.signClient?.session.getAll() || [];
  }
}

// Create a singleton instance that will be initialized with the project ID from Supabase
export let walletConnectService: WalletConnectService;

// Initialize the service with project ID from Supabase
export const initializeWalletConnectService = async (): Promise<WalletConnectService> => {
  try {
    const response = await fetch('https://peqqefvohjemxhuyvzbg.supabase.co/functions/v1/walletconnect-config', {
      headers: {
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcXFlZnZvaGplbXhodXl2emJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjM1NjAsImV4cCI6MjA2ODkzOTU2MH0.YPJYJrYziXv8b3oy3kyDKnIuK4Gknl_iTP95I4OAO9o`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlcXFlZnZvaGplbXhodXl2emJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjM1NjAsImV4cCI6MjA2ODkzOTU2MH0.YPJYJrYziXv8b3oy3kyDKnIuK4Gknl_iTP95I4OAO9o'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get WalletConnect configuration');
    }
    
    const { projectId } = await response.json();
    
    walletConnectService = new WalletConnectService({
      projectId,
      metadata: {
        name: 'OTC Trades',
        description: 'Secure OTC cryptocurrency trading platform',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });
    
    return walletConnectService;
  } catch (error) {
    console.error('Failed to initialize WalletConnect service:', error);
    throw error;
  }
};