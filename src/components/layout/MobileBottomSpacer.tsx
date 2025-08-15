import { cn } from "@/lib/utils";

interface MobileBottomSpacerProps {
  className?: string;
}

export const MobileBottomSpacer = ({ className }: MobileBottomSpacerProps) => {
  return <div className={cn("h-20 md:h-0", className)} />;
};