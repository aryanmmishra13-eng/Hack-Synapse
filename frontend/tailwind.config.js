/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Barlow Condensed"', 'sans-serif'],
        sans: ['"Outfit"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        background: '#080808',
        foreground: '#F2F0EB',
        primary: {
          DEFAULT: '#FF4D00',
          hover: '#FF6422',
          light: 'rgba(255, 77, 0, 0.1)',
        },
        card: {
          DEFAULT: '#111111',
          surface: '#161616',
          border: 'rgba(242, 240, 235, 0.08)',
        },
        muted: {
          DEFAULT: '#1E1E1E',
          foreground: '#888880',
          light: '#A0A098',
        },
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#FF4D00',
          600: '#ea580c',
          700: '#c2410c',
          900: '#7c2d12',
        },
        dark: {
          800: '#1a1a1a',
          900: '#111111',
          950: '#080808',
        }
      }
    },
  },
  plugins: [],
}
