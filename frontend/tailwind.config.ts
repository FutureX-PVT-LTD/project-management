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
            DEFAULT: '#075E46',
            hover: '#064C39',
            dark: '#043D2E',
            soft: '#EAF3EF',
            subtle: '#F4F8F6',
            light: '#F4F8F6',
            50: '#F4F8F6',
            100: '#EAF3EF',
            600: '#075E46',
            700: '#075E46',
            800: '#064C39',
            900: '#043D2E',
          },
          bg: {
            app: '#FFFFFF',
            canvas: '#FFFFFF',
            surface: '#FFFFFF',
            secondary: '#F7F8F7',
            subtle: '#F7F8F7',
            hover: '#F3F5F3',
            DEFAULT: '#FFFFFF',
          },
          surface: {
            DEFAULT: '#FFFFFF',
            secondary: '#F7F8F7',
          },
          text: {
            primary: '#181C19',
            secondary: '#626963',
            muted: '#939A95',
            disabled: '#B5BBB7',
          },
          border: {
            DEFAULT: '#E7EAE8',
            strong: '#D8DDD9',
            subtle: '#E7EAE8',
          },
          semantic: {
            danger: '#C23D3D',
            dangerBg: '#FDF2F2',
            warning: '#B87500',
            warningBg: '#FEF7EB',
            info: '#3B73B9',
            infoBg: '#EEF5FC',
            success: '#075E46',
            successBg: '#EAF3EF',
          },
        },
      },
      fontFamily: {
        sans: [
          'var(--font-instrument-sans)',
          'var(--font-inter)',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'var(--font-jetbrains-mono)',
          'JetBrains Mono',
          'IBM Plex Mono',
          'ui-monospace',
          'monospace',
        ],
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
