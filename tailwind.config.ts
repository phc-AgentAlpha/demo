import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: '#0a0b0d',
        surface: '#101216',
        'surface-2': '#15181d',
        'surface-3': '#1b1f25',
        hairline: 'rgba(255,255,255,0.06)',
        'hairline-strong': 'rgba(255,255,255,0.12)',

        // Text
        fg: '#e7eaf0',
        'fg-muted': '#9aa3b2',
        'fg-faint': '#6b7382',
        'fg-disabled': '#4a5060',

        // Accents
        cyan: '#22d3ee',
        'cyan-soft': 'rgba(34,211,238,0.12)',
        gold: '#f5b13a',
        'gold-soft': 'rgba(245,177,58,0.12)',
        violet: '#a78bfa',
        'violet-soft': 'rgba(167,139,250,0.12)',
        base: '#0052ff',

        // Numeric / status
        pos: '#34d399',
        neg: '#f87171',
        warn: '#facc15',
        info: '#60a5fa',

        // Legacy aliases (keep existing components working)
        ink: '#0a0b0d',
        panel: '#101216',
        line: 'rgba(255,255,255,0.06)',
        accent: '#22d3ee',
        success: '#34d399',
        danger: '#f87171',
        warning: '#facc15',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'display-lg': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['1.75rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        'h1': ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h2': ['1.125rem', { lineHeight: '1.35', fontWeight: '600' }],
        'h3': ['0.9375rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.55' }],
        'small': ['0.8125rem', { lineHeight: '1.4' }],
        'micro': ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '16px',
        'pill': '9999px',
      },
      boxShadow: {
        'card': '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 1px 24px rgba(0,0,0,0.45)',
        'pop': '0 12px 32px rgba(0,0,0,0.55)',
        'glow-cyan': '0 0 0 1px rgba(34,211,238,0.35), 0 0 32px rgba(34,211,238,0.18)',
        'glow-gold': '0 0 0 1px rgba(245,177,58,0.35), 0 0 32px rgba(245,177,58,0.18)',
        'glow': '0 0 80px rgba(125,211,252,0.16)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
