import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKycVerification } from "@/hooks/useKycVerification";
import { Loader2, Shield, FileText, UserCheck } from "lucide-react";
import { KycBadge } from "./KycBadge";
// @ts-ignore - Sumsub WebSDK types
import SumsubWebSdk from '@sumsub/websdk-react';

interface KycVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentKycLevel?: 'Level 0' | 'Level 1' | 'Level 2';
}

export function KycVerificationModal({ 
  open, 
  onOpenChange,
  currentKycLevel = 'Level 0'
}: KycVerificationModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>('id-and-liveness');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showSdk, setShowSdk] = useState(false);
  const { generateKycToken, isLoading, checkKycStatus } = useKycVerification();

  const handleStartVerification = async () => {
    const tokenData = await generateKycToken(selectedLevel);
    if (tokenData?.token) {
      setAccessToken(tokenData.token);
      setShowSdk(true);
    }
  };

  const handleSdkMessage = async (message: any) => {
    console.log('Sumsub SDK message:', message);
    
    if (message.type === 'onStatusChanged' && message.payload?.status === 'completed') {
      // Verification completed, close SDK and refresh status
      setShowSdk(false);
      setAccessToken(null);
      await checkKycStatus();
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setShowSdk(false);
    setAccessToken(null);
    onOpenChange(false);
  };

  const levelOptions = [
    {
      value: 'id-and-liveness',
      label: 'ID & Liveness Verification',
      description: 'ID document verification with liveness check',
      icon: <UserCheck className="h-4 w-4" />,
      disabled: currentKycLevel !== 'Level 0'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            KYC Identity Verification
          </DialogTitle>
        </DialogHeader>

        {showSdk && accessToken ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete your identity verification process below:
            </p>
            <div className="border rounded-lg overflow-hidden">
              <SumsubWebSdk
                accessToken={accessToken}
                expirationHandler={() => console.log('Token expired')}
                config={{
                  lang: 'en',
                  theme: 'dark',
                }}
                options={{
                  addViewportTag: false,
                  adaptIframeHeight: true,
                }}
                onMessage={handleSdkMessage}
                onError={(error: any) => {
                  console.error('Sumsub SDK error:', error);
                  setShowSdk(false);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Current verification level:
              </p>
              <KycBadge 
                status={currentKycLevel === 'Level 0' ? 'not_started' : 'completed'} 
                level={currentKycLevel === 'Level 1' ? 'id-and-liveness' : undefined}
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">
                Select verification level:
              </label>
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {levelOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={option.disabled}
                    >
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p>• Your documents are securely processed by Sumsub</p>
              <p>• Verification typically takes 5-10 minutes</p>
              <p>• You'll be notified when verification is complete</p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStartVerification}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Starting...
                  </>
                ) : (
                  'Start Verification'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}