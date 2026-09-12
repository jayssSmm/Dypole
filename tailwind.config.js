/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        polar: {
          950: '#060b11', // Deepest background
          900: '#0a1017', // Main background
          850: '#0e1620', // Card background
          800: '#141e2b', // Card surface lighter
          750: '#1b2738', // Card header/section
          700: '#243447', // Borders
          600: '#334862', // Hover borders
          500: '#486588', // Subtle text/lines
          400: '#64748b', // Muted text
          300: '#94a3b8', // Secondary text
          200: '#cbd5e1', // Primary text
          100: '#e2e8f0', // Bright text
          50: '#f8fafc',
        },
        cyan: {
          neon: '#00f0ff',
          glow: '#06b6d4',
          dim: '#0891b2',
          dark: '#0e7490',
        },
        solar: {
          electric: '#0284c7',
          sky: '#38bdf8',
          deep: '#0369a1',
        },
        diesel: {
          amber: '#f59e0b',
          glow: '#d97706',
          dark: '#b45309',
        },
        alert: {
          amber: '#f59e0b',
          red: '#ef4444',
          green: '#10b981',
          cyan: '#06b6d4',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Space Mono"', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.25)',
        'glow-amber': '0 0 15px rgba(245, 158, 11, 0.25)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(36, 52, 71, 0.6)',
        'card-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 240, 255, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'sweep 4s linear infinite',
      }
    },
  },
  plugins: [],
}
