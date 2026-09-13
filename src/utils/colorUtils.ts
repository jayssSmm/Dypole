/**
 * Convert Hex color string to RGB comma-separated string (e.g. #1e1e1e -> "30, 30, 30")
 */
export function hexToRgb(hex: string): string {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (c.length !== 6) {
    return '30, 30, 30'; // fallback dark charcoal
  }
  const num = parseInt(c, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `${r}, ${g}, ${b}`;
}

export const THEME_COLOR_PALETTES = [
  { name: 'Charcoal Cyber', hex: '#1e1e1e', label: 'Default' },
  { name: 'Obsidian Black', hex: '#0a0a0c', label: 'Dark' },
  { name: 'Midnight Polar', hex: '#0f172a', label: 'Navy' },
  { name: 'Deep Indigo', hex: '#111827', label: 'Slate' },
  { name: 'Abyssal Blue', hex: '#030712', label: 'Abyss' },
  { name: 'Emerald Ops', hex: '#06281e', label: 'Eco' },
  { name: 'Cyberpunk Violet', hex: '#1a102f', label: 'Neon' },
  { name: 'Glacier Steel', hex: '#1e293b', label: 'Steel' },
];

export const ACCENT_COLOR_PRESETS = [
  { name: 'Polar Cyan', hex: '#00f0ff' },
  { name: 'Ice Sky', hex: '#38bdf8' },
  { name: 'Aurora Emerald', hex: '#10b981' },
  { name: 'Solar Amber', hex: '#f59e0b' },
  { name: 'Plasma Violet', hex: '#a855f7' },
  { name: 'Rose Emergency', hex: '#f43f5e' },
  { name: 'Electric Lime', hex: '#84cc16' },
  { name: 'Pure White', hex: '#ffffff' },
];
