import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export const PageHeader = ({ 
  title, 
  subtitle, 
  action, 
  children, 
  className 
}: PageHeaderProps) => {
  return (
    <div className={cn("border-b border-border p-4", className)}>
      <div className="flex-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        {action && <div className="flex-gap-2">{action}</div>}
      </div>
      {children}
    </div>
  );
};