import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Dynamic import for Sumsub WebSDK
const SumsubWebSdk = React.lazy(() => import('@sumsub/websdk-react'));

interface KycVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerificationComplete?: () => void;
}

export function KycVerificationModal({ 
  open, 
  onOpenChange, 
  onVerificationComplete 
}: KycVerificationModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [config, setConfig] = useState<any>(null);

  const initializeKyc = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-kyc-token', {
        body: { userId: user.id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to initialize KYC');
      }

      setAccessToken(data.token);
      setConfig({
        lang: 'en',
        email: user.email,
        phone: '',
        theme: 'light',
        uiConf: {
          customCssStr: `
            .submit-form-button {
              background-color: hsl(var(--primary)) !important;
              border-color: hsl(var(--primary)) !important;
            }
            .submit-form-button:hover {
              background-color: hsl(var(--primary-foreground)) !important;
            }
          `
        }
      });

    } catch (err) {
      console.error('KYC initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize verification');
      toast.error('Failed to start verification process');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleComplete = useCallback((messageType: string, payload: any) => {
    console.log('KYC SDK message:', messageType, payload);
    
    if (messageType === 'idCheck.onApplicantSubmitted') {
      toast.success('Verification submitted successfully! We will review your documents.');
      onVerificationComplete?.();
      onOpenChange(false);
    } else if (messageType === 'idCheck.onError') {
      console.error('KYC error:', payload);
      setError('Verification failed. Please try again.');
      toast.error('Verification failed. Please try again.');
    }
  }, [onVerificationComplete, onOpenChange]);

  const handleError = useCallback((error: any) => {
    console.error('KYC SDK error:', error);
    setError('An error occurred during verification. Please try again.');
    toast.error('Verification error occurred');
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Identity Verification
          </DialogTitle>
          <DialogDescription>
            Complete your identity verification to access enhanced trading features and higher limits.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!accessToken && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Shield className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Ready to verify your identity?</h3>
                <p className="text-muted-foreground max-w-md">
                  You'll need a government-issued ID and a few minutes to complete the process.
                </p>
              </div>
              <Button onClick={initializeKyc} size="lg">
                Start Verification
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-muted-foreground">Initializing verification...</p>
            </div>
          )}

          {accessToken && config && (
            <div className="h-full">
              <React.Suspense 
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                }
              >
                <SumsubWebSdk
                  accessToken={accessToken}
                  expirationHandler={() => initializeKyc()}
                  config={config}
                  options={{
                    addViewportTag: false,
                    adaptIframeHeight: true
                  }}
                  onMessage={handleComplete}
                  onError={handleError}
                />
              </React.Suspense>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}