/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          light: '#F5D060',
          DEFAULT: '#D4AF37',
          dark: '#AA7C11',
          hover: '#E5C158',
        },
        dark: {
          950: '#0A0A0A',
          900: '#111111',
          850: '#161616',
          800: '#1E1E1E',
          700: '#2A2A2A',
          600: '#3A3A3A',
        },
      },
    },
  },
  plugins: [],
};

