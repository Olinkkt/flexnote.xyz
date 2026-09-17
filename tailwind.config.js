/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eagerGreen: {
          DEFAULT: '#58cc02',
          light: '#d7ffb8',
          dark: '#46a302',
          hover: '#61e002',
          leaf: '#a5ed6e'
        },
        sparkBlue: {
          DEFAULT: '#1cb0f6',
          light: '#ddf4ff',
          dark: '#1899d6',
          hover: '#2ec5ff'
        },
        flameOrange: {
          DEFAULT: '#ff9600',
          light: '#ffeed6',
          dark: '#e58500'
        },
        gemRuby: {
          DEFAULT: '#ff4b4b',
          light: '#ffdada',
          dark: '#ea2b2b'
        },
        crownGold: {
          DEFAULT: '#ffc800',
          light: '#fff5c0',
          dark: '#e5b400'
        },
        duoGray: {
          paper: '#ffffff',
          charcoal: '#4b4b4b',
          pencil: '#777777',
          faded: '#afafaf',
          border: '#e5e5e5',
          borderDark: '#cecece',
          canvas: '#f7f7f7',
          nightInk: '#000437'
        }
      },
      fontFamily: {
        feather: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        duo: ['"Nunito Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'duo': '12px',
        'duo-lg': '16px',
        'duo-xl': '24px',
        'duo-pill': '9999px',
      },
      boxShadow: {
        'duo-green': '0 4px 0 #46a302',
        'duo-blue': '0 4px 0 #1899d6',
        'duo-white': '0 4px 0 #e5e5e5',
        'duo-orange': '0 4px 0 #e58500',
        'duo-ruby': '0 4px 0 #ea2b2b',
        'duo-gold': '0 4px 0 #e5b400',
        'duo-card': '0 4px 0 #e5e5e5, 0 1px 3px rgba(0,0,0,0.05)',
      }
    },
  },
  plugins: [],
}
