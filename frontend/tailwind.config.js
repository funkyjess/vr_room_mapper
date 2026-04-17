/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        steam: {
          dark: '#1b2838',
          darker: '#171a21',
          blue: '#66c0f4',
          light: '#c7d5e0',
          gray: '#2a475e',
        },
      },
    },
  },
  plugins: [],
}
