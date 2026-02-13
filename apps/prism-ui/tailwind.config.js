/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        sans: ['"Exo 2"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      colors: {
        // FAA HF-STD-010A ATC 표준 팔레트
        atc: {
          black:   '#000000',
          white:   '#FFFFFF',
          gray:    '#B3B3B3',
          blue:    '#5E8DF6',
          aqua:    '#07CDED',
          green:   '#23E162',
          yellow:  '#DFF334',
          orange:  '#FE930D',
          red:     '#FF1320',
          magenta: '#D822FF',
          pink:    '#F684D8',
          brown:   '#C5955B',
          // Background / Weather (risk heat)
          'wx-green':  '#173928',
          'wx-yellow': '#5A4A14',
          'wx-red':    '#5D2E59',
        },
      },
      boxShadow: {
        'glow-green':   '0 0 8px rgba(35,225,98,0.4), 0 0 20px rgba(35,225,98,0.15)',
        'glow-red':     '0 0 8px rgba(255,19,32,0.4), 0 0 20px rgba(255,19,32,0.15)',
        'glow-orange':  '0 0 8px rgba(254,147,13,0.4), 0 0 20px rgba(254,147,13,0.15)',
        'glow-blue':    '0 0 8px rgba(94,141,246,0.4), 0 0 20px rgba(94,141,246,0.15)',
        'glow-aqua':    '0 0 8px rgba(7,205,237,0.4), 0 0 20px rgba(7,205,237,0.15)',
        'glow-yellow':  '0 0 8px rgba(223,243,52,0.4), 0 0 20px rgba(223,243,52,0.15)',
        'glow-magenta': '0 0 8px rgba(216,34,255,0.4), 0 0 20px rgba(216,34,255,0.15)',
        'glass':        '0 4px 30px rgba(0,0,0,0.3)',
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'scan-line': 'scan-line 4s linear infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
