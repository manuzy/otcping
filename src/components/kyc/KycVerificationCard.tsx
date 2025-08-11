import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { KycVerificationModal } from './KycVerificationModal';
import { KycStatusBadge, KycLevel } from './KycStatusBadge';
import { useWalletAuth } from '@/hooks/useWalletAuth';

interface KycVerificationCardProps {
  kycLevel: KycLevel;
  verificationDate?: Date | string | null;
  onVerificationUpdate?: () => void;
}

export function KycVerificationCard({ 
  kycLevel, 
  verificationDate,
  onVerificationUpdate 
}: KycVerificationCardProps) {
  const { isAuthenticated } = useWalletAuth();
  const [showModal, setShowModal] = useState(false);

  const getKycInfo = () => {
    switch (kycLevel) {
      case 'Level 2':
        return {
          title: 'Full Verification Complete',
          description: 'You have access to all trading features and maximum limits.',
          benefits: [
            'Unlimited trading volume',
            'Access to institutional features',
            'Priority customer support',
            'Advanced trading tools'
          ],
          action: null
        };
      case 'Level 1':
        return {
          title: 'Basic Verification Complete',
          description: 'You have access to enhanced trading features.',
          benefits: [
            'Higher trading limits',
            'Reduced fees',
            'Access to premium features',
            'Enhanced security'
          ],
          action: {
            text: 'Upgrade to Level 2',
            variant: 'outline' as const
          }
        };
      case 'Level 0':
      default:
        return {
          title: 'Verification Required',
          description: 'Complete identity verification to unlock enhanced features.',
          benefits: [
            'Higher trading limits',
            'Reduced transaction fees', 
            'Access to premium features',
            'Enhanced account security'
          ],
          action: {
            text: 'Start Verification',
            variant: 'default' as const
          }
        };
    }
  };

  const info = getKycInfo();

  const handleStartVerification = () => {
    if (!isAuthenticated) {
      return;
    }
    setShowModal(true);
  };

  const handleVerificationComplete = () => {
    onVerificationUpdate?.();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Identity Verification
              </CardTitle>
              <CardDescription>
                {info.description}
              </CardDescription>
            </div>
            <KycStatusBadge 
              level={kycLevel} 
              verificationDate={verificationDate}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Benefits of verification:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {info.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center gap-2">
                  <ShieldCheck className="h-3 w-3 text-primary flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {kycLevel === 'Level 1' && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Upgrade to Level 2</p>
                  <p className="text-muted-foreground">
                    Complete additional verification for unlimited access and institutional features.
                  </p>
                </div>
              </div>
            </div>
          )}

          {info.action && (
            <div className="pt-2">
              <Button 
                onClick={handleStartVerification}
                variant={info.action.variant}
                disabled={!isAuthenticated}
                className="w-full"
              >
                {info.action.text}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {!isAuthenticated && (
            <p className="text-xs text-muted-foreground text-center">
              Connect your wallet to start verification
            </p>
          )}
        </CardContent>
      </Card>

      <KycVerificationModal
        open={showModal}
        onOpenChange={setShowModal}
        onVerificationComplete={handleVerificationComplete}
      />
    </>
  );
}