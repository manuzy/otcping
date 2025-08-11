import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useKycVerification } from "@/hooks/useKycVerification";
import { KycBadge } from "./KycBadge";
import { RefreshCw, Shield } from "lucide-react";

interface KycStatusIndicatorProps {
  onStartVerification: () => void;
  className?: string;
}

export function KycStatusIndicator({ 
  onStartVerification,
  className 
}: KycStatusIndicatorProps) {
  const { checkKycStatus, kycStatus, isLoading } = useKycVerification();

  useEffect(() => {
    checkKycStatus();
  }, [checkKycStatus]);

  const handleRefresh = () => {
    checkKycStatus();
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Identity Verification
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {kycStatus ? (
          <>
            <KycBadge 
              status={kycStatus.status} 
              level={kycStatus.level}
            />
            
            {kycStatus.status === 'not_started' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Verify your identity to access higher trading limits and enhanced features.
                </p>
                <Button 
                  size="sm" 
                  onClick={onStartVerification}
                  className="w-full"
                >
                  Start Verification
                </Button>
              </div>
            )}
            
            {kycStatus.status === 'pending' && (
              <p className="text-sm text-muted-foreground">
                Your verification is being processed. This typically takes 5-10 minutes.
              </p>
            )}
            
            {kycStatus.status === 'reviewing' && (
              <p className="text-sm text-muted-foreground">
                Your documents are under manual review. You'll be notified once complete.
              </p>
            )}
            
            {kycStatus.status === 'rejected' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Verification failed. Please try again with different documents.
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={onStartVerification}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            )}
            
            {kycStatus.status === 'completed' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Identity verified successfully! You now have access to enhanced features.
                </p>
                {kycStatus.level === 'basic-kyc-level' && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onStartVerification}
                    className="w-full"
                  >
                    Upgrade to Level 2
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <KycBadge status="not_started" />
            <p className="text-sm text-muted-foreground">
              Verify your identity to access enhanced trading features.
            </p>
            <Button 
              size="sm" 
              onClick={onStartVerification}
              className="w-full"
            >
              Start Verification
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}