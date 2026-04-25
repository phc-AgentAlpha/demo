import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a1020',
        panel: '#10172a',
        line: '#243047',
        accent: '#7dd3fc',
        success: '#34d399',
        danger: '#fb7185',
        warning: '#fbbf24',
      },
      boxShadow: {
        glow: '0 0 80px rgba(125,211,252,0.16)',
      },
    },
  },
  plugins: [],
};

export default config;
