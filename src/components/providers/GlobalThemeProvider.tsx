import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface GlobalThemeContextType {
  globalTheme: string | null;
  isGlobalThemeActive: boolean;
  isLoading: boolean;
}

const GlobalThemeContext = createContext<GlobalThemeContextType>({
  globalTheme: null,
  isGlobalThemeActive: false,
  isLoading: true,
});

export const useGlobalTheme = () => useContext(GlobalThemeContext);

interface GlobalThemeProviderProps {
  children: React.ReactNode;
}

export function GlobalThemeProvider({ children }: GlobalThemeProviderProps) {
  const [globalTheme, setGlobalTheme] = useState<string | null>(() => {
    // Try to get theme from localStorage first for instant application
    const cached = localStorage.getItem('globalTheme');
    return cached || 'etf'; // Default to ETF theme
  });
  const [isGlobalThemeActive, setIsGlobalThemeActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch global theme from admin settings
    const fetchGlobalTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('global_theme')
          .limit(1)
          .single();

        if (data && !error && data.global_theme) {
          const theme = data.global_theme;
          setGlobalTheme(theme);
          setIsGlobalThemeActive(true);
          // Cache in localStorage for instant future loads
          localStorage.setItem('globalTheme', theme);
        } else {
          // No global theme in database, use ETF as default
          setGlobalTheme('etf');
          setIsGlobalThemeActive(true);
          localStorage.setItem('globalTheme', 'etf');
        }
      } catch (error) {
        console.log('No global theme set or error fetching:', error);
        // Fallback to ETF theme
        setGlobalTheme('etf');
        setIsGlobalThemeActive(true);
        localStorage.setItem('globalTheme', 'etf');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalTheme();

    // Listen for global theme changes
    const handleGlobalThemeChange = (event: CustomEvent) => {
      const newTheme = event.detail;
      setGlobalTheme(newTheme);
      setIsGlobalThemeActive(true);
      localStorage.setItem('globalTheme', newTheme);
    };

    window.addEventListener('globalThemeChanged', handleGlobalThemeChange as EventListener);

    return () => {
      window.removeEventListener('globalThemeChanged', handleGlobalThemeChange as EventListener);
    };
  }, []);

  // Show loading spinner while fetching theme to prevent flash
  if (isLoading) {
    return (
      <div className="flex-center min-h-screen bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <GlobalThemeContext.Provider value={{ globalTheme, isGlobalThemeActive, isLoading }}>
      <NextThemeProvider
        attribute="class"
        defaultTheme={globalTheme || "etf"}
        forcedTheme={isGlobalThemeActive ? globalTheme || undefined : undefined}
        enableSystem={!isGlobalThemeActive}
        disableTransitionOnChange
      >
        {children}
      </NextThemeProvider>
    </GlobalThemeContext.Provider>
  );
}