import { useState, useEffect } from 'react';

export interface AppearanceSettings {
  // Wallpaper / Background
  customBg: string | null;
  bgOverlayOpacity: number; // 0 - 95 (%)
  bgBlur: number; // 0 - 20 (px)
  bgFit: 'cover' | 'contain' | 'tile' | 'center';

  // Logo & Branding
  customLogo: string | null;
  stationName: string;
  stationSubtitle: string;

  // Tile / Card Styling
  cardBgColor: string; // e.g. '#1e1e1e'
  cardOpacity: number; // 0 - 100 (%)
  cardBlur: number; // 0 - 30 (px)
  cardBorderOpacity: number; // 0 - 100 (%)

  // Header & Subheader Styling
  headerBgColor: string; // e.g. '#1e1e1e'
  headerOpacity: number; // 0 - 100 (%)
  headerBlur: number; // 0 - 30 (px)

  // Accent & Elements Styling
  accentColor: string; // e.g. '#00f0ff'
  subpanelOpacity: number; // 0 - 100 (%)
  subpanelBgColor: string; // e.g. '#ffffff'
}

const STORAGE_KEY = 'dypole_polar_appearance_v2';

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  customBg: null,
  bgOverlayOpacity: 65,
  bgBlur: 0,
  bgFit: 'cover',
  customLogo: null,
  stationName: 'DyPole',
  stationSubtitle: 'POWER CONTROL',

  // Tile defaults
  cardBgColor: '#1e1e1e',
  cardOpacity: 65,
  cardBlur: 16,
  cardBorderOpacity: 8,

  // Header defaults
  headerBgColor: '#1e1e1e',
  headerOpacity: 85,
  headerBlur: 16,

  // Accent & Elements defaults
  accentColor: '#00f0ff',
  subpanelOpacity: 4,
  subpanelBgColor: '#ffffff',
};

// Curated high quality background presets for Antarctic & SCADA themes
export interface BgPreset {
  id: string;
  name: string;
  description: string;
  url: string | null;
  previewGradient: string;
}

export const BG_PRESETS: BgPreset[] = [
  {
    id: 'default',
    name: 'Default Polar Grid',
    description: 'Clean high-contrast SCADA tactical grid',
    url: null,
    previewGradient: 'radial-gradient(circle, #00f0ff 0%, #1e1e1e 80%)',
  },
  {
    id: 'aurora',
    name: 'Aurora Australis',
    description: 'Vibrant polar emerald and violet atmospheric glow',
    url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1920&q=80',
    previewGradient: 'linear-gradient(135deg, #052e16 0%, #064e3b 50%, #4c1d95 100%)',
  },
  {
    id: 'ice-glacier',
    name: 'Antarctic Icefield',
    description: 'Deep sub-zero ice plateau & glacial landscape',
    url: 'https://images.unsplash.com/photo-1548777123-e216912df7d8?auto=format&fit=crop&w=1920&q=80',
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #0369a1 50%, #e0f2fe 100%)',
  },
  {
    id: 'night-station',
    name: 'Polar Research Outpost',
    description: 'Night ops lights on extreme weather research base',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80',
    previewGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #0284c7 100%)',
  },
  {
    id: 'deep-space',
    name: 'Deep Satellite Orbit',
    description: 'Telemetry horizon and orbital satellite starfield',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
    previewGradient: 'linear-gradient(135deg, #030712 0%, #1e1b4b 60%, #06b6d4 100%)',
  },
];

// Curated UI Theme Presets
export interface UIThemePreset {
  id: string;
  name: string;
  cardBgColor: string;
  cardOpacity: number;
  cardBlur: number;
  cardBorderOpacity: number;
  headerBgColor: string;
  headerOpacity: number;
  accentColor: string;
}

export const UI_THEME_PRESETS: UIThemePreset[] = [
  {
    id: 'cyber-cyan',
    name: 'Cyber SCADA (Default)',
    cardBgColor: '#1e1e1e',
    cardOpacity: 65,
    cardBlur: 16,
    cardBorderOpacity: 8,
    headerBgColor: '#1e1e1e',
    headerOpacity: 85,
    accentColor: '#00f0ff',
  },
  {
    id: 'polar-obsidian',
    name: 'Polar Obsidian',
    cardBgColor: '#0a0a0c',
    cardOpacity: 80,
    cardBlur: 18,
    cardBorderOpacity: 12,
    headerBgColor: '#09090b',
    headerOpacity: 92,
    accentColor: '#38bdf8',
  },
  {
    id: 'glass-frosted',
    name: 'Ultra Glass Frosted',
    cardBgColor: '#1e293b',
    cardOpacity: 35,
    cardBlur: 24,
    cardBorderOpacity: 15,
    headerBgColor: '#0f172a',
    headerOpacity: 55,
    accentColor: '#00f0ff',
  },
  {
    id: 'emerald-eco',
    name: 'Emerald Aurora',
    cardBgColor: '#05231a',
    cardOpacity: 70,
    cardBlur: 16,
    cardBorderOpacity: 10,
    headerBgColor: '#031912',
    headerOpacity: 88,
    accentColor: '#10b981',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare Amber',
    cardBgColor: '#1c1508',
    cardOpacity: 75,
    cardBlur: 16,
    cardBorderOpacity: 12,
    headerBgColor: '#140f05',
    headerOpacity: 90,
    accentColor: '#f59e0b',
  },
  {
    id: 'midnight-navy',
    name: 'Midnight Deep Blue',
    cardBgColor: '#0f172a',
    cardOpacity: 75,
    cardBlur: 20,
    cardBorderOpacity: 10,
    headerBgColor: '#090e1a',
    headerOpacity: 90,
    accentColor: '#60a5fa',
  },
];

export function useAppearance() {
  const [appearance, setAppearance] = useState<AppearanceSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_APPEARANCE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to read appearance settings from localStorage:', e);
    }
    return DEFAULT_APPEARANCE;
  });

  // Save to localStorage when settings change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    } catch (e) {
      console.warn('Failed to persist appearance settings to localStorage:', e);
    }
  }, [appearance]);

  const updateAppearance = (updates: Partial<AppearanceSettings>) => {
    setAppearance((prev) => ({ ...prev, ...updates }));
  };

  const setCustomBackground = (dataUrl: string | null) => {
    setAppearance((prev) => ({ ...prev, customBg: dataUrl }));
  };

  const setCustomLogo = (dataUrl: string | null) => {
    setAppearance((prev) => ({ ...prev, customLogo: dataUrl }));
  };

  const resetAppearance = () => {
    setAppearance(DEFAULT_APPEARANCE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  };

  return {
    appearance,
    updateAppearance,
    setCustomBackground,
    setCustomLogo,
    resetAppearance,
  };
}
