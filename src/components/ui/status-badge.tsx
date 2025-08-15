import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        active: "border-transparent bg-status-active text-status-active-foreground",
        pending: "border-transparent bg-status-pending text-status-pending-foreground", 
        completed: "border-transparent bg-status-completed text-status-completed-foreground",
        cancelled: "border-transparent bg-status-cancelled text-status-cancelled-foreground",
        expired: "border-transparent bg-status-expired text-status-expired-foreground",
        // Trade type variants
        buy: "border-transparent bg-success text-success-foreground",
        sell: "border-transparent bg-error text-error-foreground",
        // Verification status variants
        verified: "border-transparent bg-success text-success-foreground",
        "not_verified": "border-transparent bg-error text-error-foreground",
        // Legal status variants
        ongoing: "border-transparent bg-warning text-warning-foreground",
        litigation: "border-transparent bg-error text-error-foreground",
        "regulatory_action": "border-transparent bg-warning text-warning-foreground",
        // Severity variants
        low: "border-transparent bg-success text-success-foreground",
        medium: "border-transparent bg-warning text-warning-foreground", 
        high: "border-transparent bg-error text-error-foreground",
        critical: "border-transparent bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ className, status, ...props }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(statusBadgeVariants({ status }), className)} 
        {...props} 
      />
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge, statusBadgeVariants }