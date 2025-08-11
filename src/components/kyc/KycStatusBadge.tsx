import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, Shield, AlertTriangle, Clock } from "lucide-react";

export type KycLevel = 'Level 0' | 'Level 1' | 'Level 2';

interface KycStatusBadgeProps {
  level: KycLevel;
  verificationDate?: Date | string | null;
  className?: string;
}

export function KycStatusBadge({ 
  level, 
  verificationDate,
  className = ""
}: KycStatusBadgeProps) {
  const getKycBadgeConfig = () => {
    switch (level) {
      case 'Level 2':
        return {
          text: 'KYC Level 2',
          icon: ShieldCheck,
          className: 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 border-emerald-200 hover:from-emerald-100 hover:to-green-100',
          tooltip: 'Full KYC verification completed. Access to all trading features and maximum limits.'
        };
      case 'Level 1':
        return {
          text: 'KYC Level 1',
          icon: Shield,
          className: 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-200 hover:from-blue-100 hover:to-indigo-100',
          tooltip: 'Basic KYC verification completed. Access to enhanced trading features and higher limits.'
        };
      case 'Level 0':
      default:
        return {
          text: 'Not Verified',
          icon: AlertTriangle,
          className: 'bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-200 hover:from-amber-100 hover:to-orange-100',
          tooltip: 'Identity verification required for enhanced features and higher trading limits.'
        };
    }
  };

  const config = getKycBadgeConfig();
  const Icon = config.icon;

  const formatVerificationDate = () => {
    if (!verificationDate || level === 'Level 0') return null;
    
    const date = typeof verificationDate === 'string' 
      ? new Date(verificationDate) 
      : verificationDate;
    
    return `Verified: ${date.toLocaleDateString()}`;
  };

  const verificationInfo = formatVerificationDate();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={`text-xs flex items-center gap-1.5 px-2.5 py-1 transition-all duration-200 ${config.className} ${className}`}
        >
          <Icon size={12} className="flex-shrink-0" />
          <span className="font-medium">{config.text}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" align="center" sideOffset={5} className="z-50">
        <div className="max-w-xs">
          <p className="font-semibold">{config.tooltip}</p>
          {verificationInfo && (
            <p className="text-xs text-muted-foreground mt-1">{verificationInfo}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}