import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Check, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useGlobalTheme } from "@/components/providers/GlobalThemeProvider";

const themes = [
  {
    name: "light",
    label: "Light",
    description: "Clean light theme with modern design",
    preview: "bg-background border"
  },
  {
    name: "dark", 
    label: "Dark",
    description: "Sleek dark theme for low-light environments",
    preview: "bg-background border"
  },
  {
    name: "blue",
    label: "Ocean Blue", 
    description: "Professional blue theme with ocean tones",
    preview: "bg-background border"
  },
  {
    name: "green",
    label: "Forest Green",
    description: "Natural green theme with forest aesthetics", 
    preview: "bg-background border"
  },
  {
    name: "etf",
    label: "ETF Professional",
    description: "Enterprise ETF theme with premium aesthetics",
    preview: "bg-background border"
  }
];

export function GlobalThemeSwitcher() {
  const { settings, updating, updateGlobalTheme } = useAdminSettings();
  const { globalTheme, isGlobalThemeActive } = useGlobalTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const currentTheme = settings?.global_theme || 'system';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Global Theme Settings
        </CardTitle>
        <CardDescription>
          Set the theme for all users across the application. This will override individual user preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Current global theme:</span>
          <Badge variant="outline" className="flex items-center gap-1">
            <Palette className="h-3 w-3" />
            {currentTheme}
          </Badge>
          {isGlobalThemeActive && (
            <>
              <span>•</span>
              <Badge variant="default" className="text-xs">
                Active Globally
              </Badge>
            </>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {themes.map((themeOption) => (
            <Button
              key={themeOption.name}
              variant={currentTheme === themeOption.name ? "default" : "outline"}
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => updateGlobalTheme(themeOption.name)}
              disabled={updating}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${themeOption.preview}`} />
                  <Label className="font-medium">{themeOption.label}</Label>
                </div>
                {currentTheme === themeOption.name && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-xs text-left text-muted-foreground">
                {themeOption.description}
              </p>
            </Button>
          ))}
        </div>

        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateGlobalTheme("system")}
            className="flex items-center gap-2"
            disabled={updating}
          >
            <span>Use System Default</span>
            {currentTheme === "system" && <Check className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <strong>Note:</strong> This setting affects all users. Individual users can still override this in their personal settings if needed.
        </div>
      </CardContent>
    </Card>
  );
}