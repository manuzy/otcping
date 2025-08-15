import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  xs: 'icon-xs',
  sm: 'icon-sm', 
  md: 'icon-md',
  lg: 'icon-lg',
  xl: 'icon-xl'
};

export const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  return (
    <Loader2 className={cn('loading-spinner', sizeClasses[size], className)} />
  );
};