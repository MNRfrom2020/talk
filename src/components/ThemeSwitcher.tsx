
"use client";

import { useTheme } from "@/context/ThemeContext";
import { themes } from "@/lib/themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ThemeSwitcher() {
  const { theme: currentTheme, setTheme } = useTheme();

  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-medium">Theme</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {themes.map((theme) => (
          <Card
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={cn(
              "cursor-pointer transition-all",
              currentTheme === theme.id ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{theme.name}</span>
                {currentTheme === theme.id && <CheckCircle className="h-5 w-5 text-primary" />}
              </CardTitle>
              <CardDescription>{theme.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                {Object.entries(theme.colors).filter(([key]) => key.startsWith('primary') || key.startsWith('accent') || key.startsWith('background')).map(([key, value]) => (
                  <div key={key} className="h-8 w-8 rounded-full border border-border" style={{ background: `hsl(${value})` }} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
