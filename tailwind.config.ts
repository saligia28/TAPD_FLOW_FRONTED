import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,jsx,js}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        panel: {
          base: '#111111',
          card: '#1a1a1a',
          accent: '#ffffff',
          subtle: '#6b7280',
        },
      },
      boxShadow: {
        pixel: '0 0 0 2px #ffffff',
        pixelInset: 'inset 0 0 0 1px #ffffff',
      },
    },
  },
  plugins: [],
};

export default config;
