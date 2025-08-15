import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Check } from "lucide-react";
import { useState, useEffect } from "react";

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
  }
];

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex-gap-2">
          <Palette className="icon-md" />
          Theme Switcher
        </CardTitle>
        <CardDescription>
          Choose your preferred theme for the application interface
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex-gap-2 text-sm text-muted-foreground">
          <span>Current theme:</span>
          <Badge variant="outline">{theme || 'system'}</Badge>
          {resolvedTheme && resolvedTheme !== theme && (
            <>
              <span>•</span>
              <span>Resolved: {resolvedTheme}</span>
            </>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {themes.map((themeOption) => (
            <Button
              key={themeOption.name}
              variant={theme === themeOption.name ? "default" : "outline"}
              className="h-auto p-4 flex-col items-start gap-2"
              onClick={() => setTheme(themeOption.name)}
            >
              <div className="flex-between w-full">
                <div className="flex-gap-2">
                  <div className={`w-4 h-4 rounded-full ${themeOption.preview}`} />
                  <Label className="font-medium">{themeOption.label}</Label>
                </div>
                {theme === themeOption.name && (
                  <Check className="icon-sm text-primary" />
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
            onClick={() => setTheme("system")}
            className="flex-gap-2"
          >
            <span>Use System Theme</span>
            {theme === "system" && <Check className="icon-sm" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}