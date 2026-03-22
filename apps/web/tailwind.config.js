/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'hsl(var(--brand-primary, var(--primary)))',
          secondary: 'hsl(var(--brand-secondary, var(--secondary)))',
          accent: 'hsl(var(--brand-accent, var(--accent)))',
        },
      },
      fontFamily: {
        brand: ['var(--brand-font, Inter)', 'sans-serif'],
      },
    },
  },
};
