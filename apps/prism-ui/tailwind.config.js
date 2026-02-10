/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
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
    },
  },
  plugins: [],
};
