import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fx: {
          green: {
            DEFAULT: '#0B6B4F',
            hover: '#095A43',
            dark: '#084C39',
            soft: '#EAF3EE',
            subtle: '#F3F8F5',
            light: '#F3F8F5',
            50: '#F3F8F5',
            100: '#EAF3EE',
            600: '#0B6B4F',
            700: '#0B6B4F',
            800: '#095A43',
            900: '#084C39',
          },
          bg: {
            app: '#F5F6F4',
            surface: '#FFFFFF',
            subtle: '#F9FAF9',
            hover: '#F3F5F3',
            DEFAULT: '#F5F6F4',
          },
          surface: {
            DEFAULT: '#FFFFFF',
            secondary: '#F9FAF9',
          },
          text: {
            primary: '#1D211F',
            secondary: '#666D68',
            muted: '#929993',
          },
          border: {
            DEFAULT: '#E3E7E4',
            strong: '#D4DAD6',
            subtle: '#ECEFEA',
          },
          semantic: {
            danger: '#C93C3C',
            dangerBg: '#FDF2F2',
            warning: '#B97800',
            warningBg: '#FEF7EB',
            info: '#3978C6',
            infoBg: '#EEF5FC',
            success: '#0B6B4F',
            successBg: '#EAF3EE',
          },
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'var(--font-inter)',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '9px',
        md: '9px',
        lg: '10px',
        xl: '12px',
        '2xl': '14px',
        '3xl': '16px',
      },
      boxShadow: {
        none: 'none',
        subtle: 'none',
        card: 'none',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        popover: '0 4px 20px 0 rgba(29, 33, 31, 0.07), 0 1px 3px 0 rgba(29, 33, 31, 0.03)',
        drawer: '-4px 0 24px 0 rgba(29, 33, 31, 0.06)',
      },
      keyframes: {
        fxFadeIn: {
          from: { opacity: '0', transform: 'translateY(2px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeIn: 'fxFadeIn 150ms ease-out forwards',
      },
      zIndex: {
        base: '0',
        sticky: '10',
        header: '30',
        dropdown: '50',
        popover: '50',
        drawer: '60',
        backdrop: '70',
        modal: '80',
        toast: '90',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
      },
    },
  },

  plugins: [],
};

export default config;
