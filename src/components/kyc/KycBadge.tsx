import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KycBadgeProps {
  status: string;
  level?: string;
  className?: string;
  showIcon?: boolean;
}

export function KycBadge({ 
  status, 
  level, 
  className,
  showIcon = true 
}: KycBadgeProps) {
  const getIcon = () => {
    if (!showIcon) return null;
    
    switch (status) {
      case 'completed':
        return <ShieldCheck className="h-3 w-3" />;
      case 'pending':
      case 'reviewing':
        return <Clock className="h-3 w-3" />;
      case 'rejected':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Shield className="h-3 w-3" />;
    }
  };

  const getText = () => {
    switch (status) {
      case 'completed':
        return level === 'id-and-liveness' ? 'ID & Liveness Verified' : 'Verified';
      case 'pending':
        return 'Verification Pending';
      case 'reviewing':
        return 'Under Review';
      case 'rejected':
        return 'Verification Failed';
      case 'not_started':
        return 'Not Verified';
      default:
        return 'Verification Started';
    }
  };

  const getVariant = () => {
    switch (status) {
      case 'completed':
        return 'default' as const;
      case 'pending':
      case 'reviewing':
        return 'secondary' as const;
      case 'rejected':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Badge 
      variant={getVariant()} 
      className={cn("flex items-center gap-1 text-xs", className)}
    >
      {getIcon()}
      {getText()}
    </Badge>
  );
}