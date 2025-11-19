import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,jsx,js}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        hacker: ['"Share Tech Mono"', 'monospace'],
      },
      colors: {
        hacker: {
          bg: '#050505',
          panel: '#0a0a0a',
          border: '#333333',
          primary: '#00ff41',
          secondary: '#008f11',
          alert: '#ff0055',
          text: {
            main: '#e0e0e0',
            dim: '#888888',
            code: '#00ff41',
          },
        },
      },
      boxShadow: {
        neon: '0 0 5px rgba(0, 255, 65, 0.5), 0 0 10px rgba(0, 255, 65, 0.3)',
        'neon-alert': '0 0 5px rgba(255, 0, 85, 0.5), 0 0 10px rgba(255, 0, 85, 0.3)',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glitch': 'glitch 1s linear infinite',
      },
      keyframes: {
        glitch: {
          '2%, 64%': { transform: 'translate(2px,0) skew(0deg)' },
          '4%, 60%': { transform: 'translate(-2px,0) skew(0deg)' },
          '62%': { transform: 'translate(0,0) skew(5deg)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
