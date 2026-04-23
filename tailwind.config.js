/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00C853',
          dark: '#1B5E20',
          light: '#F1F8E9',
        },
      },
    },
  },
  plugins: [],
}
