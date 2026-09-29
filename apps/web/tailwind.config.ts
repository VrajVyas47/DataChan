import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="midnight-dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-low': 'var(--color-surface-low)',
        'surface-high': 'var(--color-surface-high)',
        'surface-elevated': 'var(--color-surface-elevated)',
        'inverse-surface': 'var(--color-inverse-surface)',
        'inverse-text': 'var(--color-inverse-text)',
        'text-main': 'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          container: 'var(--color-primary-container)',
          text: 'var(--color-primary-text)',
          fixed: 'var(--color-primary-fixed)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          container: 'var(--color-secondary-container)',
          text: 'var(--color-secondary-text)',
          fixed: 'var(--color-secondary-fixed)',
        },
        tertiary: {
          DEFAULT: 'var(--color-tertiary)',
          container: 'var(--color-tertiary-container)',
          text: 'var(--color-tertiary-text)',
          fixed: 'var(--color-tertiary-fixed)',
        },
        warning: 'var(--color-warning)',
        error: {
          DEFAULT: 'var(--color-error)',
          container: 'var(--color-error-container)',
          text: 'var(--color-error-text)',
        },
      },
      borderRadius: {
        sm: '0.5rem',
        DEFAULT: '1rem',
        md: '1.25rem',
        lg: '1.75rem',
        xl: '2.25rem',
        full: '9999px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        soft: '0 8px 24px -4px rgba(30, 32, 42, 0.04), 0 2px 6px -1px rgba(30, 32, 42, 0.02)',
        floating: '0 12px 32px -6px rgba(19, 20, 27, 0.24)',
        popover: '0 20px 40px -8px rgba(30, 32, 42, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
