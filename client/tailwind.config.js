/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ─── Color Palette ─────────────────────────────────────────────────
      colors: {
        // Semantic Theme Tokens (Light/Dark adaptive)
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        'surface-card': 'var(--surface)',
        'surface-glass': 'var(--surface-glass)',

        // Brand / Crimson-Rose
        brand: {
          50:   '#fff1f2',
          100:  '#ffe4e6',
          200:  '#fecdd3',
          300:  '#fda4af',
          400:  '#fb7185',
          500:  '#FF3352',   // glow / hover
          600:  '#DC2626',   // primary CTA
          700:  '#b91c1c',
          800:  '#991b1b',
          900:  '#7f1d1d',
          DEFAULT: '#DC2626',
        },
        // Dark surface layers (navy → midnight)
        surface: {
          DEFAULT: 'var(--surface)',
          950: '#080D18',   // body background
          900: '#0F1729',   // section background
          800: '#182235',   // card background
          700: '#1E2D44',   // elevated card / dropdown
          600: '#243551',   // input / subtle
        },
        // Teal — available / success states
        teal: {
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#22C8A0',
          600: '#0d9488',
          700: '#0f766e',
        },
        // Amber — warning / high urgency
        amber: {
          400: '#fbbf24',
          500: '#F59E0B',
          600: '#d97706',
        },
        // Sky — info / medium urgency
        sky: {
          400: '#38bdf8',
          500: '#3B9EFF',
          600: '#0284c7',
        },
        // Urgency system
        urgency: {
          critical: '#E01515',
          high:     '#F37020',
          medium:   '#3B9EFF',
          low:      '#64748b',
        },
        // Legacy aliases so existing pages still compile
        lightbg: {
          DEFAULT: '#f8fafc',
          card:    '#ffffff',
          hover:   '#f1f5f9',
          border:  '#e2e8f0',
        },
      },

      // ─── Typography ────────────────────────────────────────────────────
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },

      // ─── Shadows ───────────────────────────────────────────────────────
      boxShadow: {
        // Card depth on the dark background
        'card':          '0 4px 24px rgba(0,0,0,0.40)',
        'card-hover':    '0 8px 40px rgba(0,0,0,0.55)',
        'elevated':      '0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)',
        // Coloured glows
        'glow-brand':    '0 0 32px -4px rgba(220,38,38,0.55)',
        'glow-brand-lg': '0 0 55px -6px rgba(220,38,38,0.60)',
        'glow-teal':     '0 0 28px -4px rgba(34,200,160,0.50)',
        'glow-amber':    '0 0 28px -4px rgba(245,158,11,0.50)',
        'glow-sky':      '0 0 24px -4px rgba(59,158,255,0.45)',
        // Urgency badges
        'urgency-critical': '0 0 14px rgba(224,21,21,0.75)',
        'urgency-high':     '0 0 10px rgba(243,112,32,0.55)',
        // Inner highlight for glass
        'glass-inset':   'inset 0 1px 0 rgba(255,255,255,0.07)',
      },

      // ─── Border colours ────────────────────────────────────────────────
      borderColor: {
        glass:      'rgba(255,255,255,0.07)',
        'glass-md': 'rgba(255,255,255,0.12)',
        'glass-lg': 'rgba(255,255,255,0.18)',
      },

      // ─── Backdrop blur ─────────────────────────────────────────────────
      backdropBlur: {
        xs:   '4px',
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '20px',
        '2xl': '28px',
      },

      // ─── Animations ────────────────────────────────────────────────────
      animation: {
        // Existing (kept for backward-compat)
        'spin-slow':         'spin 12s linear infinite',
        'spin-reverse-slow': 'spin-reverse 15s linear infinite',
        'flip-y':            'flipY 4s ease-in-out infinite',
        // New design-system animations
        'fade-in':           'fadeIn 0.4s ease-out both',
        'fade-in-up':        'fadeInUp 0.45s ease-out both',
        'fade-in-down':      'fadeInDown 0.35s ease-out both',
        'slide-in-right':    'slideInRight 0.35s ease-out both',
        'scale-in':          'scaleIn 0.3s ease-out both',
        'pulse-glow':        'pulseGlow 2s ease-in-out infinite',
        'pulse-glow-amber':  'pulseGlowAmber 2.2s ease-in-out infinite',
        'blob-drift':        'blobDrift 18s ease-in-out infinite alternate',
        'blob-drift-2':      'blobDrift2 22s ease-in-out infinite alternate',
        'blob-drift-3':      'blobDrift3 26s ease-in-out infinite alternate',
        'shimmer':           'shimmer 2s linear infinite',
        'float':             'float 6s ease-in-out infinite',
      },

      keyframes: {
        // Existing
        'spin-reverse': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(-360deg)' },
        },
        flipY: {
          '0%, 100%': { transform: 'rotateY(0deg)' },
          '50%':      { transform: 'rotateY(180deg)' },
        },
        // Entrance animations
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          from: { opacity: '0', transform: 'translateY(-12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.93)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        // Glow pulses (emergency / critical)
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 16px rgba(220,38,38,0.55)' },
          '50%':      { boxShadow: '0 0 36px rgba(220,38,38,0.90), 0 0 60px rgba(220,38,38,0.30)' },
        },
        pulseGlowAmber: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(245,158,11,0.40)' },
          '50%':      { boxShadow: '0 0 28px rgba(245,158,11,0.75)' },
        },
        // Background blob drift (very subtle)
        blobDrift: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '50%':  { transform: 'translate(40px, -30px) scale(1.08)' },
          '100%': { transform: 'translate(-20px, 20px) scale(0.96)' },
        },
        blobDrift2: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '50%':  { transform: 'translate(-50px, 35px) scale(1.05)' },
          '100%': { transform: 'translate(30px, -25px) scale(0.98)' },
        },
        blobDrift3: {
          '0%':   { transform: 'translate(0px, 0px) scale(1)' },
          '50%':  { transform: 'translate(25px, 45px) scale(1.06)' },
          '100%': { transform: 'translate(-35px, -20px) scale(0.97)' },
        },
        // Skeleton shimmer
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        // Floating card
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
      },

      // ─── Misc ──────────────────────────────────────────────────────────
      borderRadius: {
        'card':  '1rem',    // 16px — standard card
        'panel': '1.5rem',  // 24px — modals, hero
      },
    },
  },
  plugins: [],
};
