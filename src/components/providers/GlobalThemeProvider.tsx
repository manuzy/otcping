import { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';

interface GlobalThemeContextType {
  globalTheme: string | null;
  isGlobalThemeActive: boolean;
}

const GlobalThemeContext = createContext<GlobalThemeContextType>({
  globalTheme: null,
  isGlobalThemeActive: false,
});

export const useGlobalTheme = () => useContext(GlobalThemeContext);

interface GlobalThemeProviderProps {
  children: React.ReactNode;
}

export function GlobalThemeProvider({ children }: GlobalThemeProviderProps) {
  const [globalTheme, setGlobalTheme] = useState<string | null>(null);
  const [isGlobalThemeActive, setIsGlobalThemeActive] = useState(false);

  useEffect(() => {
    // Fetch global theme from admin settings
    const fetchGlobalTheme = async () => {
      try {
        const { data, error } = await supabase
          .from('admin_settings')
          .select('global_theme')
          .limit(1)
          .single();

        if (data && !error) {
          setGlobalTheme(data.global_theme);
          setIsGlobalThemeActive(true);
        }
      } catch (error) {
        console.log('No global theme set or error fetching:', error);
        setIsGlobalThemeActive(false);
      }
    };

    fetchGlobalTheme();

    // Listen for global theme changes
    const handleGlobalThemeChange = (event: CustomEvent) => {
      setGlobalTheme(event.detail);
      setIsGlobalThemeActive(true);
    };

    window.addEventListener('globalThemeChanged', handleGlobalThemeChange as EventListener);

    return () => {
      window.removeEventListener('globalThemeChanged', handleGlobalThemeChange as EventListener);
    };
  }, []);

  return (
    <GlobalThemeContext.Provider value={{ globalTheme, isGlobalThemeActive }}>
      <NextThemeProvider
        attribute="class"
        defaultTheme={globalTheme || "system"}
        forcedTheme={isGlobalThemeActive ? globalTheme || undefined : undefined}
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemeProvider>
    </GlobalThemeContext.Provider>
  );
}