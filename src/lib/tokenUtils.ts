import { Token } from '@/hooks/useTokens';

// Truncate token address for display
export const truncateAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Get blockchain explorer URL based on chain_id
export const getExplorerUrl = (chainId: number, address: string): string => {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/token/',
    10: 'https://optimistic.etherscan.io/token/',
    56: 'https://bscscan.com/token/',
    137: 'https://polygonscan.com/token/',
    8453: 'https://basescan.org/token/',
    42161: 'https://arbiscan.io/token/',
  };

  const baseUrl = explorers[chainId];
  return baseUrl ? `${baseUrl}${address}` : '#';
};

// Format token for display
export const formatTokenDisplay = (token: Token): string => {
  return `${token.name} (${token.symbol}) - ${truncateAddress(token.address)}`;
};

// Format token name only for trigger display
export const formatTokenNameOnly = (token: Token): string => {
  return token.name;
};

// Convert token to ReactSelect option format
export const tokenToSelectOption = (token: Token) => ({
  label: formatTokenDisplay(token),
  value: token.address,
  token: token,
});

// Convert token to trigger ReactSelect option format (name only)
export const tokenToTriggerSelectOption = (token: Token) => ({
  label: formatTokenNameOnly(token),
  value: token.address,
  token: token,
});