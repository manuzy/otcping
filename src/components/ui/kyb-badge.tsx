import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, Shield, AlertTriangle } from "lucide-react";

export type KybStatus = 'verified' | 'not_verified' | 'pending';

interface KybBadgeProps {
  status: KybStatus;
  provider?: string;
  verifiedAt?: Date;
  verificationType?: 'basic' | 'full';
}

export function KybBadge({ 
  status, 
  provider, 
  verifiedAt, 
  verificationType 
}: KybBadgeProps) {
  const getKybBadgeConfig = () => {
    switch (status) {
      case 'verified':
        return {
          text: 'Verified by KYB',
          icon: ShieldCheck,
          className: 'bg-success text-success-foreground border-success',
          tooltip: 'This institution has successfully completed Know Your Business (KYB) verification.'
        };
      case 'pending':
        return {
          text: 'KYB Pending',
          icon: Shield,
          className: 'bg-warning text-warning-foreground border-warning',
          tooltip: 'KYB verification is in progress.'
        };
      case 'not_verified':
      default:
        return {
          text: 'Not KYB Verified',
          icon: AlertTriangle,
          className: 'bg-error text-error-foreground border-error',
          tooltip: 'This institution has not completed KYB verification. Use caution.'
        };
    }
  };

  const config = getKybBadgeConfig();
  const Icon = config.icon;

  const formatVerificationDetails = () => {
    if (status !== 'verified' || !verifiedAt) return null;
    
    const details = [];
    if (provider) details.push(`Provider: ${provider}`);
    if (verificationType) details.push(`Type: ${verificationType.charAt(0).toUpperCase() + verificationType.slice(1)}`);
    if (verifiedAt) details.push(`Verified: ${verifiedAt.toLocaleDateString()}`);
    
    return details.length > 0 ? details.join(' | ') : null;
  };

  const additionalDetails = formatVerificationDetails();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`text-xs flex items-center gap-1 ${config.className}`}>
          <Icon size={12} />
          {config.text}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" sideOffset={5} className="z-50">
        <div className="max-w-xs">
          <p className="font-semibold">{config.tooltip}</p>
          {additionalDetails && (
            <p className="text-xs text-muted-foreground mt-1">{additionalDetails}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}