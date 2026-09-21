/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C3CE9',
          50: '#F3EFFE',
          100: '#E7DEFD',
          200: '#CFBDFB',
          300: '#B69BF7',
          400: '#9B74F2',
          500: '#8B5CF6',
          600: '#6C3CE9',
          700: '#5A2FC7',
          800: '#48279E',
          900: '#372079',
          950: '#231150',
        },
        secondary: '#8B5CF6',
        surface: '#F8F7FC',
        ink: '#171321',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(23,19,33,0.04), 0 8px 24px -12px rgba(23,19,33,0.12)',
        lift: '0 2px 6px rgba(23,19,33,0.05), 0 18px 40px -18px rgba(108,60,233,0.35)',
        glow: '0 0 0 1px rgba(108,60,233,0.12), 0 20px 45px -20px rgba(108,60,233,0.55)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.2,.7,.3,1) both',
        'fade-in': 'fade-in .4s ease both',
        'scale-in': 'scale-in .25s cubic-bezier(.2,.7,.3,1) both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
