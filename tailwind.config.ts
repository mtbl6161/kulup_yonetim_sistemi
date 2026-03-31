import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
      colors: {
        bg: '#f5f2ec',
        surface: '#fffef9',
        surface2: '#f0ede4',
        border: '#d8d0be',
        accent: '#2d5a3d',
        'accent-dark': '#1e4229',
        accent2: '#c8832a',
        accent3: '#7a3b2e',
        'text-main': '#1a1a14',
        'text-sub': '#5a5748',
        'text-muted': '#8a8070',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.08)',
        'card-lg': '0 8px 32px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
export default config
