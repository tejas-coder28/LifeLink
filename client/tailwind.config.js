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
        heading: ['"Plus Jakarta Sans"', 'Sora', 'sans-serif'],
        sora:    ['Sora', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },

      // ─── Blood Group Palette ───────────────────────────────────────────
      colors: {
        ...(() => {
          return {
            blood: {
              'ap':  '#F43F5E',
              'an':  '#FB7185',
              'bp':  '#8B5CF6',
              'bn':  '#A78BFA',
              'abp': '#2DD4BF',
              'abn': '#5EEAD4',
              'op':  '#38BDF8',
              'on':  '#7DD3FC',
            },
          };
        })(),
      },

      // ─── Shadows & Glows ───────────────────────────────────────────────
      boxShadow: {
        // Spatial 5-Level Elevations
        'elevation-canvas':   'none',
        'elevation-base':     '0 4px 20px -2px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
        'elevation-raised':   '0 10px 32px -4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
        'elevation-floating': '0 16px 48px -6px rgba(0,0,0,0.45), 0 0 32px -4px rgba(244,63,94,0.18), inset 0 1px 0 rgba(255,255,255,0.22)',
        'elevation-overlay':  '0 24px 64px -8px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.14), inset 0 1px 0 rgba(255,255,255,0.28)',

        // Standard Depth layers
        'card':          '0 4px 24px rgba(0,0,0,0.40)',
        'card-hover':    '0 12px 40px rgba(0,0,0,0.55)',
        'elevated':      '0 20px 50px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.08)',
        // Luminous glows
        'glow-brand':    '0 0 32px -4px rgba(244,63,94,0.50)',
        'glow-brand-lg': '0 0 55px -6px rgba(244,63,94,0.65)',
        'glow-violet':   '0 0 32px -4px rgba(139,92,246,0.45)',
        'glow-teal':     '0 0 28px -4px rgba(45,212,191,0.45)',
        'glow-amber':    '0 0 28px -4px rgba(245,158,11,0.45)',
        // Glass top edge specular highlight
        'glass-inset':   'inset 0 1px 0 rgba(255,255,255,0.15)',
        'glass-specular': 'inset 0 1px 1px 0 rgba(255,255,255,0.35), inset 0 -1px 1px 0 rgba(0,0,0,0.20)',
      },

      // ─── Border colours ────────────────────────────────────────────────
      borderColor: {
        glass:      'rgba(255,255,255,0.08)',
        'glass-md': 'rgba(255,255,255,0.14)',
        'glass-lg': 'rgba(255,255,255,0.22)',
        'glass-top':'rgba(255,255,255,0.28)',
      },

      // ─── Backdrop blur ─────────────────────────────────────────────────
      backdropBlur: {
        xs:   '4px',
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '20px',
        '2xl': '24px',
        '3xl': '32px',
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
        'blob-drift-4':      'blobDrift4 32s ease-in-out infinite alternate',
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
          '0%':   { transform: 'translate3d(0px, 0px, 0px) scale(1)' },
          '50%':  { transform: 'translate3d(40px, -30px, 0px) scale(1.08)' },
          '100%': { transform: 'translate3d(-20px, 20px, 0px) scale(0.96)' },
        },
        blobDrift2: {
          '0%':   { transform: 'translate3d(0px, 0px, 0px) scale(1)' },
          '50%':  { transform: 'translate3d(-50px, 35px, 0px) scale(1.05)' },
          '100%': { transform: 'translate3d(30px, -25px, 0px) scale(0.98)' },
        },
        blobDrift3: {
          '0%':   { transform: 'translate3d(0px, 0px, 0px) scale(1)' },
          '50%':  { transform: 'translate3d(25px, 45px, 0px) scale(1.06)' },
          '100%': { transform: 'translate3d(-35px, -20px, 0px) scale(0.97)' },
        },
        blobDrift4: {
          '0%':   { transform: 'translate3d(0px, 0px, 0px) scale(1)' },
          '50%':  { transform: 'translate3d(-30px, -45px, 0px) scale(1.09)' },
          '100%': { transform: 'translate3d(40px, 30px, 0px) scale(0.95)' },
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
        'card':  '1.25rem', // 20px
        'panel': '1.75rem', // 28px
        'modal': '2rem',    // 32px
      },
    },
  },
  plugins: [],
};
