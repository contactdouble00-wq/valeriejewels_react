/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--color-primary)',
          'primary-hover': 'var(--color-primary-hover)',
          'primary-light': 'var(--color-primary-light)',
          secondary: 'var(--color-secondary)',
          tertiary: 'var(--color-tertiary)',
          'tertiary-hover': 'var(--color-tertiary-hover)',
          'tertiary-light': 'var(--color-tertiary-light)',
          surface: 'var(--color-surface)',
          border: 'var(--color-border)',
          muted: 'var(--color-muted)',
          gold: '#D4AF37',
          'gold-light': '#F4E8C1',
        },
      },
      fontFamily: {
        serif: ['"Marcellus"', 'Georgia', 'serif'],
        display: ['"Marcellus"', 'Georgia', 'serif'],
        caps: ['"Tenor Sans"', '"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'luxury': '0 10px 30px -10px rgba(38, 21, 61, 0.15)',
        'luxury-hover': '0 20px 40px -15px rgba(131, 102, 176, 0.25)',
        'glow': '0 0 25px rgba(131, 102, 176, 0.35)',
      },
    },
  },
  plugins: [],
};
