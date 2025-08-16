import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { MessageStatus } from "@/hooks/useMessageStatus";

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  size?: "sm" | "md";
}

export const MessageStatusIndicator = ({ status, size = "sm" }: MessageStatusIndicatorProps) => {
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  
  switch (status) {
    case 'sending':
      return <Clock className={`${iconSize} text-muted-foreground animate-spin`} />;
    
    case 'sent':
      return <Check className={`${iconSize} text-muted-foreground`} />;
    
    case 'delivered':
      return <CheckCheck className={`${iconSize} text-muted-foreground`} />;
    
    case 'read':
      return <CheckCheck className={`${iconSize} text-blue-500`} />;
    
    default:
      return <AlertCircle className={`${iconSize} text-red-500`} />;
  }
};