import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#060810',
        space: '#0a0e14',
        panel: '#0d1520',
        elevated: '#111d2e',
        overlay: '#162034',
        cyan: {
          glow: '#00d4ff',
          mid: '#0099cc',
          dim: '#005f80',
          ghost: '#00d4ff1a',
        },
        gold: {
          bright: '#c9a227',
          mid: '#a07d1a',
          dim: '#5a4510',
          ghost: '#c9a2271a',
        },
        border: {
          DEFAULT: '#1a2540',
          active: '#00d4ff40',
          subtle: '#0f1c30',
        },
        status: {
          kill: '#e53e3e',
          loss: '#fc8181',
          safe: '#38a169',
          neutral: '#718096',
          hostile: '#e53e3e',
          friendly: '#4299e1',
          corp: '#38a169',
        },
        text: {
          primary: '#e8eaf0',
          secondary: '#8892a4',
          muted: '#4a5568',
          accent: '#00d4ff',
        },
      },
      fontFamily: {
        ui: ['Rajdhani', 'Barlow Condensed', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
