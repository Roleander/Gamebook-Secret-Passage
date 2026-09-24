"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";

interface ThemeCustomizerProps {
  currentTheme: string | null;
  onThemeUpdate: (theme: string) => void;
}

const PRESET_THEMES = [
  { name: "Mazmorra (default)", primaryColor: "#c9a96e", bgColor: "#1a1410", accentColor: "#8b4513" },
  { name: "Bosque", primaryColor: "#4a7c59", bgColor: "#1a2410", accentColor: "#6b8e4e" },
  { name: "Océano", primaryColor: "#4a7c9c", bgColor: "#101a24", accentColor: "#5a9cbf" },
  { name: "Lava", primaryColor: "#c94a4a", bgColor: "#241010", accentColor: "#bf5a3a" },
  { name: "Noche", primaryColor: "#8b7cc9", bgColor: "#101024", accentColor: "#7a5abf" },
  { name: "Pergamino", primaryColor: "#8b7355", bgColor: "#f5f0e6", accentColor: "#6b5a3e" },
];

function safeParse(raw: string | null): typeof PRESET_THEMES[0] | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.primaryColor === "string") return p;
  } catch {}
  return null;
}

export function ThemeCustomizer({ currentTheme, onThemeUpdate }: ThemeCustomizerProps) {
  const parsed = safeParse(currentTheme) || PRESET_THEMES[0];
  const [primaryColor, setPrimaryColor] = useState(parsed.primaryColor);
  const [bgColor, setBgColor] = useState(parsed.bgColor);
  const [accentColor, setAccentColor] = useState(parsed.accentColor);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const p = safeParse(currentTheme);
    if (p) {
      setPrimaryColor(p.primaryColor);
      setBgColor(p.bgColor);
      setAccentColor(p.accentColor || p.primaryColor);
      setDirty(false);
    }
  }, [currentTheme]);

  const update = (
    setter: (v: string) => void,
    value: string
  ) => {
    setter(value);
    setDirty(true);
  };

  const handlePreset = (preset: typeof PRESET_THEMES[0]) => {
    setPrimaryColor(preset.primaryColor);
    setBgColor(preset.bgColor);
    setAccentColor(preset.accentColor);
    setDirty(true);
  };

  const handleSave = () => {
    const theme = JSON.stringify({ primaryColor, bgColor, accentColor });
    onThemeUpdate(theme);
    setDirty(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Tema de colores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {PRESET_THEMES.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePreset(preset)}
              className="p-2 rounded border border-border hover:border-primary text-xs text-left"
              style={{ backgroundColor: preset.bgColor }}
            >
              <div className="flex items-center gap-1 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.primaryColor }} />
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.accentColor }} />
              </div>
              <span style={{ color: preset.primaryColor }}>{preset.name}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Color principal</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => update(setPrimaryColor, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <span className="text-xs">{primaryColor}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fondo</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => update(setBgColor, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <span className="text-xs">{bgColor}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Acento</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => update(setAccentColor, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <span className="text-xs">{accentColor}</span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded border border-border" style={{ backgroundColor: bgColor }}>
          <p style={{ color: primaryColor }} className="font-bold">Vista previa del título</p>
          <p style={{ color: accentColor }} className="text-sm">Texto de ejemplo con color de acento</p>
        </div>

        <Button onClick={handleSave} className="w-full" disabled={!dirty}>
          {dirty ? "Guardar tema" : "Tema guardado"}
        </Button>
      </CardContent>
    </Card>
  );
}
