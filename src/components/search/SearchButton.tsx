import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGlobalSearch } from './GlobalSearchProvider';
import { cn } from '@/lib/utils';

interface SearchButtonProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showShortcut?: boolean;
  className?: string;
}

export const SearchButton = ({ 
  variant = 'ghost', 
  size = 'sm', 
  showShortcut = true,
  className 
}: SearchButtonProps) => {
  const { openSearch } = useGlobalSearch();

  return (
    <Button
      variant={variant}
      size={size}
      onClick={openSearch}
      className={cn(
        "gap-2",
        showShortcut && "min-w-[200px] justify-between",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        <span className="text-sm">Search</span>
      </div>
      {showShortcut && (
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      )}
    </Button>
  );
};