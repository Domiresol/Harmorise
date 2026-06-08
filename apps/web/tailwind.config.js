/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx,html}',
    '../../libs/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0EA5E9', // sky-500
          light:   '#7DD3FC', // sky-300
          pale:    '#E0F2FE', // sky-100
          dark:    '#0284C7', // sky-600
        },
        accent: {
          DEFAULT: '#2DD4BF', // teal-400
          light:   '#CCFBF1', // teal-100
        },
        // 시멘틱
        success: '#10B981',
        warning: '#F59E0B',
        error:   '#EF4444',
        // 배경 (sky tinted gray)
        surface: '#F0F9FF',
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['11px', { lineHeight: '1.4' }],
        'sm':   ['13px', { lineHeight: '1.5' }],
        'base': ['15px', { lineHeight: '1.6' }],
        'md':   ['17px', { lineHeight: '1.5' }],
        'lg':   ['20px', { lineHeight: '1.4' }],
        'xl':   ['24px', { lineHeight: '1.3' }],
        '2xl':  ['32px', { lineHeight: '1.2' }],
      },
      borderRadius: {
        'card': '16px',
        'btn':  '12px',
        'pill': '9999px',
        'item': '12px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(14,165,233,0.15)',
        'fab': '0 4px 16px rgba(14,165,233,0.35)',
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'tab-bar': '60px',
      },
    },
  },
  plugins: [],
};
