/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        xs: '400px',
      },
      colors: {
        navy:  '#0e214d',
        coral: '#e8604a',
        coralDark: '#d04535',
      },
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['"Playfair Display"', 'serif'],
        domine:  ['Domine', 'serif'],
      },
    },
  },
  plugins: [],
};
