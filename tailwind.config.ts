import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1A1A1A', secondary: '#5A5A57', muted: '#70706A' },
        gray: {
          50: '#FAFAF8', 100: '#F4F3EF', 200: '#E5E4DF', 300: '#C8C7C0',
          400: '#70706A', 500: '#696963', 600: '#5A5A57', 700: '#454541',
          800: '#2E302B', 900: '#1A1A1A', 950: '#11120F',
        },
        blue: { 50:'#F1F4F5',100:'#E2EAEE',200:'#C9D7DE',300:'#A5BCC8',400:'#7C99AA',500:'#607F92',600:'#4C697B',700:'#3C5768',800:'#2E4351',900:'#22323D' },
        emerald: { 50:'#F1F5F0',100:'#E2EBDF',200:'#CADCC6',300:'#A8C1A3',400:'#829F7C',500:'#64865E',600:'#3F6B47',700:'#355A3C',800:'#2B4931',900:'#223927' },
        green: { 50:'#F1F5F0',100:'#E2EBDF',200:'#CADCC6',300:'#A8C1A3',400:'#829F7C',500:'#64865E',600:'#3F6B47',700:'#355A3C',800:'#2B4931',900:'#223927' },
        red: { 50:'#FBF2EE',100:'#F4E3DA',200:'#EAC8B9',300:'#DFA38D',400:'#CB7960',500:'#C04A32',600:'#A8422F',700:'#8E3829',800:'#732F24',900:'#58261E' },
        rose: { 50:'#FBF2F0',100:'#F2E1DC',200:'#E7C4BD',300:'#D4A197',400:'#BE7C6F',500:'#AA5C4F',600:'#994A3C',700:'#7C3C32',800:'#633128',900:'#4B271F' },
        amber: { 50:'#F8F5EC',100:'#EEE7D3',200:'#DFD2AC',300:'#C9B57D',400:'#B19959',500:'#9C8042',600:'#856832',700:'#6C5429',800:'#574323',900:'#42331C' },
        purple: { 50:'#F5F2F7',100:'#EAE3EE',200:'#D7CBDD',300:'#BDAAC7',400:'#A18BAB',500:'#897394',600:'#735F7D',700:'#5E4E67',800:'#4B3F53',900:'#392F40' },
        violet: { 50:'#F5F2F7',100:'#EAE3EE',200:'#D7CBDD',300:'#BDAAC7',400:'#A18BAB',500:'#897394',600:'#735F7D',700:'#5E4E67',800:'#4B3F53',900:'#392F40' },
        cyan: { 50:'#F0F5F4',100:'#DEEBE8',200:'#C2D8D2',300:'#9BBBB3',400:'#789E95',500:'#5F827A',600:'#486C64',700:'#3B5952',800:'#2F4741',900:'#253730' },
        sidebar: {
          bg: '#F4F3EF',
          'bg-hover': '#EAE9E2',
          text: '#5A5A57',
          'text-active': '#1A1A1A',
          accent: '#1A1A1A',
          border: '#E5E4DF',
        },
        brand: {
          accent: '#1A1A1A',
          'accent-light': '#EEEEE7',
          'accent-hover': '#3D4137',
          'accent-muted': '#929588',
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#FAFAF8',
          muted: '#F4F3EF',
          border: '#E5E4DF',
        },
      },
      borderRadius: {
        xl: '0.25rem',
        '2xl': '0.375rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        sm: 'none',
        DEFAULT: '0 1px 3px rgb(35 39 30 / 0.05)',
        md: '0 3px 10px rgb(35 39 30 / 0.07)',
        lg: '0 8px 24px rgb(35 39 30 / 0.10)',
        xl: '0 16px 42px rgb(35 39 30 / 0.14)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
