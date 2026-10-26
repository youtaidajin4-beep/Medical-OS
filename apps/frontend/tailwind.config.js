/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effafc',
          100: '#d7f1f6',
          200: '#b4e3ed',
          300: '#81cedf',
          400: '#46b0c9',
          500: '#2a94af',
          600: '#0d7490',
          700: '#0e6178',
          800: '#125063',
          900: '#144354',
          950: '#062b39',
        },
        surface: {
          DEFAULT: '#f8fafc',
          muted: '#f1f5f9',
        },
        /**
         * 診察画面の配色。
         *
         * もともと画面ごとに #0c2f2c / #fbfaf6 / #e8c98a を直書きしていて、
         * tailwind の brand（teal）と2系統が混在していた。診察の流れで使う色をここに集め、
         * 新しい画面は必ずここから取る。
         *
         * 深緑は落ち着きと「医療の紙」の雰囲気、生成りの背景は白より目が疲れない、
         * 金は「ここを押す」の一点だけに使う。
         */
        /**
         * Medical Calm × Playful Intelligence。
         * warm white の地に、mint・blue-green・cyan をごく淡く重ねる。文字は純黒でなく charcoal。
         * 強い青一色の医療SaaSにしない。新しい画面（サイドナビ・ホーム・録音・SOAP）はここから色を取る。
         */
        aura: {
          paper: '#faf8f4',
          mist: '#f2f5f2',
          cloud: '#e9efec',
          line: '#e4e9e5',
          ink: '#24302e',
          'ink-soft': '#4a5855',
          'ink-muted': '#8a9794',
          mint: { 50: '#eefaf5', 100: '#d9f3e9', 200: '#b9e9d6', 300: '#8cdcc0', 400: '#5cc9a7', 500: '#34b394' },
          teal: { 400: '#2fa39b', 500: '#1f8a85', 600: '#177370', 700: '#14615f' },
          cyan: { 100: '#e0f5f9', 200: '#bfe9f1', 300: '#8ed9e6' },
          amber: '#f3d9a4',
        },
        clinic: {
          ink: '#0c2f2c',
          'ink-soft': '#134540',
          'ink-muted': '#6f8f88',
          line: '#d7e2dd',
          paper: '#fbfaf6',
          tint: '#f2f7f5',
          gold: '#e8c98a',
          cream: '#f3efe4',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          'var(--font-noto-sans-jp)',
          'Hiragino Kaku Gothic ProN',
          'Hiragino Sans',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        float: '0 1px 1px rgb(36 48 46 / 0.03), 0 8px 24px -8px rgb(36 48 46 / 0.10), 0 24px 48px -24px rgb(36 48 46 / 0.10)',
        'float-lg': '0 2px 2px rgb(36 48 46 / 0.03), 0 18px 40px -12px rgb(36 48 46 / 0.14), 0 40px 80px -32px rgb(31 138 133 / 0.18)',
        glow: '0 0 0 1px rgb(255 255 255 / 0.5) inset, 0 6px 18px -4px rgb(31 138 133 / 0.45), 0 14px 32px -12px rgb(52 179 148 / 0.5)',
        'card-hover': '0 4px 12px -2px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.06)',
      },
      keyframes: {
        // 終わったあとに transform を残さない（残すと、中の position: fixed が画面でなくこの要素を基準にして、パネルが半分で切れる）
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'none' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'sound-bar': {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'orb-breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.045)' },
        },
        'orb-drift': {
          '0%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(6%,-5%) scale(1.08)' },
          '66%': { transform: 'translate(-5%,4%) scale(0.96)' },
          '100%': { transform: 'translate(0,0) scale(1)' },
        },
        'orb-ripple': {
          '0%': { transform: 'scale(1)', opacity: '0.35' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-240px 0' },
          '100%': { backgroundPosition: '240px 0' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out backwards',
        'fade-in-up': 'fade-in-up 0.35s ease-out backwards',
        'scale-in': 'scale-in 0.2s ease-out backwards',
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sound-bar': 'sound-bar 0.9s ease-in-out infinite',
        'toast-in': 'toast-in 0.25s ease-out both',
        'orb-breathe': 'orb-breathe 5s ease-in-out infinite',
        'orb-drift': 'orb-drift 14s ease-in-out infinite',
        'orb-ripple': 'orb-ripple 3.6s ease-out infinite',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
