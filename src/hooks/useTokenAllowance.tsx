import { useState, useEffect } from 'react';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { erc20Abi, parseUnits } from 'viem';
import { useToast } from '@/hooks/use-toast';

interface UseTokenAllowanceProps {
  tokenAddress?: string;
  ownerAddress?: string;
  spenderAddress: string;
  requiredAmount?: string;
  tokenDecimals?: number;
  chainId?: number;
}

export const useTokenAllowance = ({
  tokenAddress,
  ownerAddress,
  spenderAddress,
  requiredAmount = '0',
  tokenDecimals = 18,
  chainId = 1
}: UseTokenAllowanceProps) => {
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { toast } = useToast();

  const requiredAmountBigInt = requiredAmount ? parseUnits(requiredAmount, tokenDecimals) : 0n;
  const hasEnoughAllowance = allowance >= requiredAmountBigInt;

  const checkAllowance = async () => {
    if (!tokenAddress || !ownerAddress || !publicClient) {
      console.log('🔍 Allowance check skipped:', { tokenAddress, ownerAddress, publicClient: !!publicClient });
      setAllowance(0n);
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Checking allowance:', { 
        tokenAddress, 
        ownerAddress, 
        spenderAddress,
        requiredAmount,
        requiredAmountBigInt: requiredAmountBigInt.toString()
      });
      
      const result = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
      });
      
      console.log('✅ Allowance result:', {
        allowance: result.toString(),
        hasEnoughAllowance: result >= requiredAmountBigInt
      });
      
      setAllowance(result as bigint);
    } catch (error) {
      console.error('❌ Failed to check allowance:', error);
      setAllowance(0n);
    } finally {
      setIsLoading(false);
    }
  };

  const approve = async (amount?: string) => {
    if (!tokenAddress || !walletClient || !address) {
      throw new Error('Missing required data for approval');
    }

    try {
      setIsApproving(true);
      
      // Use max uint256 for unlimited approval if no specific amount provided
      const approvalAmount = amount 
        ? parseUnits(amount, tokenDecimals)
        : BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      const request = await publicClient?.simulateContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, approvalAmount],
        account: address,
      });

      if (!request) throw new Error('Failed to simulate contract call');

      const hash = await walletClient.writeContract(request.request);

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      // Refresh allowance after approval
      await checkAllowance();

      toast({
        title: "Approval Successful",
        description: "Token approval confirmed. You can now place your order.",
      });

      return hash;
    } catch (error) {
      console.error('Failed to approve token:', error);
      
      let errorMessage = 'Failed to approve token';
      if (error instanceof Error) {
        if (error.message.includes('User rejected') || error.message.includes('denied')) {
          errorMessage = 'Transaction was cancelled';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Approval Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsApproving(false);
    }
  };

  useEffect(() => {
    checkAllowance();
  }, [tokenAddress, ownerAddress, spenderAddress, chainId]);

  return {
    allowance,
    hasEnoughAllowance,
    isLoading,
    isApproving,
    approve,
    checkAllowance,
  };
};