import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { SearchModal } from './SearchModal';
import { ChatSearchResult } from '@/types/chat';

interface GlobalSearchContextType {
  openSearch: () => void;
  closeSearch: () => void;
  isSearchOpen: boolean;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export const useGlobalSearch = () => {
  const context = useContext(GlobalSearchContext);
  if (context === undefined) {
    throw new Error('useGlobalSearch must be used within a GlobalSearchProvider');
  }
  return context;
};

interface GlobalSearchProviderProps {
  children: React.ReactNode;
  onResultSelect?: (result: ChatSearchResult) => void;
}

export const GlobalSearchProvider = ({ children, onResultSelect }: GlobalSearchProviderProps) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        openSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openSearch]);

  const value = {
    openSearch,
    closeSearch,
    isSearchOpen,
  };

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      <SearchModal
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onResultSelect={onResultSelect}
      />
    </GlobalSearchContext.Provider>
  );
};