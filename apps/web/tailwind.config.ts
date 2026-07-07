import type { Config } from 'tailwindcss';

/**
 * Colors map to CSS variables (see styles/tokens.css). This lets us swap the
 * entire theme (dark mode) and accent color at runtime by changing variables,
 * without recompiling Tailwind. `<alpha-value>` keeps opacity utilities working.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        text: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--c-accent-fg) / <alpha-value>)',
        'prio-low': 'rgb(var(--c-prio-low) / <alpha-value>)',
        'prio-med': 'rgb(var(--c-prio-med) / <alpha-value>)',
        'prio-high': 'rgb(var(--c-prio-high) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
      },
      boxShadow: {
        sheet: 'var(--shadow-sheet)',
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
