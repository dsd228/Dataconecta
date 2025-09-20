/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'montserrat': ['Montserrat', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        glass: {
          'white': 'rgba(255, 255, 255, 0.1)',
          'dark': 'rgba(0, 0, 0, 0.1)',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'gradient-glassmorphism': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-accent': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
      },
      border: {
        'glass': '1px solid rgba(255, 255, 255, 0.18)',
      }
    },
  },
  plugins: [],
}