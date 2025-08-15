import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export const FormSection = ({ 
  title, 
  description, 
  children, 
  className,
  actions 
}: FormSectionProps) => {
  return (
    <div className={cn("form-section", className)}>
      {(title || description) && (
        <div className="form-section-header">
          <div>
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="form-field-group">
        {children}
      </div>
    </div>
  );
};