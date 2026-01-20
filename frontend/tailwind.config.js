/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AArete Brand Colors - Light Theme
        primary: {
          50: '#fef7f3',
          100: '#fdeee6',
          200: '#fbd5c2',
          300: '#f7b794',
          400: '#f5882e', // Cadmium
          500: '#E8601A', // Sunrise - primary brand color
          600: '#d05316',
          700: '#ad4513',
          800: '#8a3710',
          900: '#6e2c0d',
        },
        secondary: {
          50: '#fefbf3',
          100: '#fef6e2',
          200: '#fceab8',
          300: '#f9da86',
          400: '#f6c44e',
          500: '#F19411', // Tangerine - secondary brand color
          600: '#d9830f',
          700: '#b56e0d',
          800: '#91580a',
          900: '#744708',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // AArete Light theme surfaces
        surface: {
          50: '#FFFFFF',  // White - primary background
          100: '#FAFAFA',
          200: '#EEEEEE', // Bright Gray
          300: '#E5E5E5',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#222222', // Dusk - dark text
          950: '#171717',
        },
        // AArete specific brand colors
        aarete: {
          sunrise: '#E8601A',
          tangerine: '#F19411',
          cadmium: '#F5882E',
          dusk: '#222222',
          brightGray: '#EEEEEE',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'dropdown': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
