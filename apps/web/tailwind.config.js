/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6eaf2',
          100: '#c2cce0',
          200: '#9aaccc',
          300: '#728cb8',
          400: '#5474a8',
          500: '#365c98',
          600: '#2f528a',
          700: '#26457a',
          800: '#1d3a6a',
          900: '#1a365d', // Lucy College navy blue
          950: '#0f1f38',
        },
      },
    },
  },
  plugins: [],
}
