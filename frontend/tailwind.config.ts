import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['var(--font-outfit)', 'Outfit', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      // Fibonacci spacing scale
      spacing: {
        'phi-3': '3px',
        'phi-5': '5px',
        'phi-8': '8px',
        'phi-13': '13px',
        'phi-21': '21px',
        'phi-34': '34px',
        'phi-55': '55px',
        'phi-89': '89px',
      },
      // Golden ratio typography scale
      fontSize: {
        'phi-xs': ['0.618rem', { lineHeight: '1.618' }],
        'phi-sm': ['0.875rem', { lineHeight: '1.618' }],
        'phi-base': ['1rem', { lineHeight: '1.618' }],
        'phi-lg': ['1.125rem', { lineHeight: '1.618' }],
        'phi-xl': ['1.618rem', { lineHeight: '1.4' }],
        'phi-2xl': ['2.618rem', { lineHeight: '1.2' }],
      },
      // Layout proportions
      width: {
        'phi-major': '61.8%',
        'phi-minor': '38.2%',
      },
      maxWidth: {
        'phi-content': '987px',
        'phi-wide': '1597px',
      },
      // Golden rectangle aspect ratio
      aspectRatio: {
        'golden': '1.618',
      },
      colors: {
        background: '#FAFAFA', // Very subtle off-white
        surface: '#FFFFFF',
        primary: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#171717', // Deep black/neutral
          950: '#0a0a0a',
        },
        accent: '#6366f1', // Indigo-500 matching the sleek dot highlight
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        }
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        app: 'var(--app-shadow)',
        sm: 'var(--app-shadow)',
        DEFAULT: 'var(--app-shadow)',
        md: 'var(--app-shadow)',
        lg: 'var(--app-shadow)',
        xl: 'var(--app-shadow)',
        '2xl': 'var(--app-shadow)',
        search: 'var(--app-shadow)',
        'card-hover': 'var(--app-shadow)',
      },
    },
  },
  plugins: [],
};
export default config;
