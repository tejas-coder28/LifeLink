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

        // Crimson/Rose Brand (#F43F5E)
        brand: {
          50:   '#fff1f2',
          100:  '#ffe4e6',
          200:  '#fecdd3',
          300:  '#fda4af',
          400:  '#fb7185',
          500:  '#F43F5E',   // primary rose brand
          600:  '#E11D48',   // primary CTA gradient start
          700:  '#BE123C',   // gradient end
          800:  '#9F1239',
          900:  '#881337',
          DEFAULT: '#F43F5E',
        },

        // Violet-Indigo Secondary (#8B5CF6)
        violet: {
          400: '#a78bfa',
          500: '#8B5CF6',
          600: '#7c3aed',
          700: '#6d28d9',
          DEFAULT: '#8B5CF6',
        },

        // Dark surface layers (Midnight Navy base #070B14 -> #0F1629)
        surface: {
          DEFAULT: 'var(--surface)',
          950: '#070B14',   // midnight navy base ground
          900: '#0D1629',   // section background
          800: '#141F36',   // card background
          700: '#1B2947',   // elevated card / dropdown
          600: '#24355A',   // input / subtle borders
        },

        // Teal Success (#2DD4BF)
        teal: {
          300: '#5eead4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          DEFAULT: '#2DD4BF',
        },

        // Amber Warning (#F59E0B)
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          DEFAULT: '#F59E0B',
        },

        // Sky Info (#38BDF8)
        sky: {
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
          DEFAULT: '#38BDF8',
        },

        // Urgency system
        urgency: {
          critical: '#F43F5E',
          high:     '#F97316',
          medium:   '#38BDF8',
          low:      '#64748B',
        },

        // Light background support
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

      // ─── Shadows & Glows ───────────────────────────────────────────────
      boxShadow: {
        // Depth layers
        'card':          '0 4px 24px rgba(0,0,0,0.40)',
        'card-hover':    '0 12px 40px rgba(0,0,0,0.55)',
        'elevated':      '0 20px 50px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.08)',
        // Luminous glows
        'glow-brand':    '0 0 32px -4px rgba(244,63,94,0.50)',
        'glow-brand-lg': '0 0 55px -6px rgba(244,63,94,0.65)',
        'glow-violet':   '0 0 32px -4px rgba(139,92,246,0.45)',
        'glow-teal':     '0 0 28px -4px rgba(45,212,191,0.45)',
        'glow-amber':    '0 0 28px -4px rgba(245,158,11,0.45)',
        // Glass top edge highlight
        'glass-inset':   'inset 0 1px 0 rgba(255,255,255,0.10)',
      },

      // ─── Border colours ────────────────────────────────────────────────
      borderColor: {
        glass:      'rgba(255,255,255,0.08)',
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

      // ─── Keyframe Animations ───────────────────────────────────────────
      animation: {
        'fade-in':           'fadeIn 0.3s ease-out both',
        'fade-in-up':        'fadeInUp 0.4s ease-out both',
        'slide-in-right':    'slideInRight 0.35s ease-out both',
        'scale-in':          'scaleIn 0.25s ease-out both',
        'pulse-glow':        'pulseGlow 2s ease-in-out infinite',
        'pulse-glow-amber':  'pulseGlowAmber 2.2s ease-in-out infinite',
        'blob-drift':        'blobDrift 20s ease-in-out infinite alternate',
        'blob-drift-2':      'blobDrift2 24s ease-in-out infinite alternate',
        'blob-drift-3':      'blobDrift3 28s ease-in-out infinite alternate',
        'shimmer':           'shimmer 2s linear infinite',
        'float':             'float 6s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 16px rgba(244,63,94,0.45)' },
          '50%':      { boxShadow: '0 0 36px rgba(244,63,94,0.85), 0 0 60px rgba(244,63,94,0.30)' },
        },
        pulseGlowAmber: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(245,158,11,0.40)' },
          '50%':      { boxShadow: '0 0 28px rgba(245,158,11,0.75)' },
        },
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
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },

      borderRadius: {
        'card':  '1rem',    // 16px — standard card
        'panel': '1.5rem',  // 24px — modals, hero
      },
    },
  },
  plugins: [],
};
