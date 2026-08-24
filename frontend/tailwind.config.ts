import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fx: {
          green: {
            50: '#F2FAF6',
            100: '#E8F5EE',
            600: '#0B8A55',
            700: '#087A4B',
            800: '#076241',
            900: '#064E35',
            DEFAULT: '#087A4B',
            hover: '#076241',
            soft: '#E8F5EE',
            light: '#F2FAF6',
          },
          bg: {
            app: '#F6F8F7',
            surface: '#FFFFFF',
            subtle: '#FAFBFA',
            DEFAULT: '#F6F8F7',
          },
          surface: '#FFFFFF',
          text: {
            primary: '#18211C',
            secondary: '#5F6B64',
            muted: '#8A948E',
          },
          border: {
            DEFAULT: '#E2E7E4',
            strong: '#CDD5D0',
            subtle: '#EDF1EE',
          },
          semantic: {
            success: '#14804A',
            successBg: '#E8F5EE',
            warning: '#B76E00',
            warningBg: '#FEF6E6',
            danger: '#C33A3A',
            dangerBg: '#FDF2F2',
            info: '#3578C9',
            infoBg: '#EFF6FC',
          },
          status: {
            green: '#14804A',
            greenBg: '#E8F5EE',
            amber: '#B76E00',
            amberBg: '#FEF6E6',
            red: '#C33A3A',
            redBg: '#FDF2F2',
            blue: '#3578C9',
            blueBg: '#EFF6FC',
            gray: '#5F6B64',
            grayBg: '#F0F3F1',
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '12px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(24, 33, 28, 0.04)',
        card: '0 1px 2px 0 rgba(24, 33, 28, 0.03)',
        popover: '0 4px 16px 0 rgba(24, 33, 28, 0.08), 0 1px 3px 0 rgba(24, 33, 28, 0.04)',
        drawer: '-4px 0 24px 0 rgba(24, 33, 28, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
