import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ContentContainerProps {
  children: ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg";
}

export const ContentContainer = ({ 
  children, 
  className,
  spacing = "md"
}: ContentContainerProps) => {
  const spacingClasses = {
    sm: "space-y-2",
    md: "space-y-3", 
    lg: "space-y-6"
  };

  return (
    <div className={cn(
      "flex-1 overflow-y-auto p-4 pb-20 md:pb-4",
      spacingClasses[spacing],
      className
    )}>
      {children}
    </div>
  );
};