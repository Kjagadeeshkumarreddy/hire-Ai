/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        surface: '#171717',
        border: '#262626',
        primary: {
          50: '#f0fdfa',
          500: '#14b8a6', // Teal focus
          600: '#0d9488',
        },
        text: {
          main: '#f5f5f5',
          muted: '#a3a3a3'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
