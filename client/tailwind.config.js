/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ─── "Midnight Navy + Crimson + Ice" Semantic Tokens ─────────────────
      colors: {
        // Base backgrounds & surfaces
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        overlay: 'var(--overlay)',

        // Typography
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        hairline: 'var(--hairline)',

        // Semantic states
        danger: {
          DEFAULT: 'var(--danger)',
          solid: 'var(--danger-solid)',
          hover: 'var(--danger-hover)',
          pressed: 'var(--danger-pressed)',
          text: 'var(--red-text)',
        },
        success: {
          DEFAULT: 'var(--success)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
        },
        info: {
          DEFAULT: 'var(--info)',
        },
        ice: {
          DEFAULT: 'var(--ice)',
        },
        focus: 'var(--focus)',

        // Backward compatibility mappings
        crimson: {
          DEFAULT: 'var(--danger)',
          solid: 'var(--danger-solid)',
          hover: 'var(--danger-hover)',
          pressed: 'var(--danger-pressed)',
          50:  'rgba(229, 72, 77, 0.06)',
          100: 'rgba(229, 72, 77, 0.12)',
          200: 'rgba(229, 72, 77, 0.20)',
          300: 'rgba(229, 72, 77, 0.35)',
          400: 'var(--red-text)',
          500: 'var(--danger)',
          600: 'var(--danger-pressed)',
          700: 'var(--danger-pressed)',
        },
        'crimson-text': 'var(--red-text)',
        'red-text': 'var(--red-text)',
        'surface-card': 'var(--surface-card)',
        'surface-glass': 'var(--surface-glass)',

        brand: {
          DEFAULT: 'var(--danger)',
          solid: 'var(--danger-solid)',
          50:   'rgba(229, 72, 77, 0.06)',
          100:  'rgba(229, 72, 77, 0.12)',
          200:  'rgba(229, 72, 77, 0.20)',
          300:  'rgba(229, 72, 77, 0.35)',
          400:  'var(--red-text)',
          500:  'var(--danger)',
          600:  'var(--danger-pressed)',
        },

        midnight: {
          DEFAULT: '#0A0F1C',
          950: '#0A0F1C',
          900: '#111A2E',
          850: '#18233D',
          800: '#1F2C4A',
        },

        obsidian: {
          DEFAULT: 'var(--canvas)',
          950: 'var(--canvas)',
          900: 'var(--surface)',
          800: 'var(--raised)',
        },

        silver: {
          DEFAULT: 'var(--text-muted)',
          50:  'rgba(147, 161, 189, 0.05)',
          100: 'rgba(147, 161, 189, 0.10)',
          200: 'rgba(147, 161, 189, 0.18)',
          300: 'rgba(147, 161, 189, 0.30)',
          400: 'var(--text-muted)',
          500: 'var(--text-muted)',
          600: 'var(--text-secondary)',
          700: 'var(--text-secondary)',
        },

        // Urgency mapping
        urgency: {
          critical: 'var(--danger)',
          high:     'var(--danger)',
          medium:   'var(--warning)',
          low:      'var(--info)',
        },
      },

      // ─── Typography ────────────────────────────────────────────────────
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'Sora', 'sans-serif'],
        sora:    ['Sora', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },

      // ─── Shadows & Glows ───────────────────────────────────────────────
      boxShadow: {
        'elevation-canvas':   'none',
        'elevation-base':     'var(--shadow-card)',
        'elevation-raised':   'var(--shadow-card-hover)',
        'elevation-floating': 'var(--shadow-elevated)',
        'elevation-overlay':  '0 24px 64px -8px rgba(10, 15, 28, 0.85), var(--glass-specular)',

        card:          'var(--shadow-card)',
        'card-hover':  'var(--shadow-card-hover)',
        elevated:      'var(--shadow-elevated)',

        'glow-crimson':  '0 0 24px -4px rgba(229, 72, 77, 0.45)',
        'glow-danger':   '0 0 24px -4px rgba(229, 72, 77, 0.45)',
        'glow-info':     '0 0 24px -4px rgba(96, 165, 250, 0.35)',
        'glow-ice':      '0 0 24px -4px rgba(165, 216, 255, 0.30)',
        'glow-success':  '0 0 24px -4px rgba(52, 211, 153, 0.35)',
        'glow-warning':  '0 0 24px -4px rgba(251, 191, 36, 0.35)',

        'glass-inset':   'var(--glass-inset)',
        'glass-specular': 'var(--glass-specular)',
      },

      // ─── Border colors ─────────────────────────────────────────────────
      borderColor: {
        glass:       'var(--hairline)',
        hairline:    'var(--hairline)',
        'glass-md':  'var(--border-strong)',
        'glass-lg':  'var(--border-strong)',
        'glass-top': 'var(--glass-border-highlight)',
      },

      // ─── Backdrop blur ─────────────────────────────────────────────────
      backdropBlur: {
        xs:   '4px',
        sm:   '8px',
        md:   '12px',
        lg:   '16px',
        xl:   '20px',
        '2xl': '26px',
        '3xl': '32px',
      },

      // ─── Keyframe Animations ───────────────────────────────────────────
      animation: {
        'fade-in':           'fadeIn 0.3s ease-out both',
        'fade-in-up':        'fadeInUp 0.4s ease-out both',
        'slide-in-right':    'slideInRight 0.35s ease-out both',
        'scale-in':          'scaleIn 0.25s ease-out both',
        'pulse-glow':        'pulseGlowDanger 2s ease-in-out infinite',
        'blob-drift':        'blobDrift 40s ease-in-out infinite alternate',
        'blob-drift-2':      'blobDrift2 48s ease-in-out infinite alternate',
        'blob-drift-3':      'blobDrift3 42s ease-in-out infinite alternate',
        'blob-drift-4':      'blobDrift4 35s ease-in-out infinite alternate',
        'shimmer':           'shimmer 2s linear infinite',
        'float':             'float 6s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(18px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlowDanger: {
          '0%, 100%': {
            boxShadow: '0 0 16px rgba(229, 72, 77, 0.40)',
          },
          '50%': {
            boxShadow: '0 0 28px rgba(229, 72, 77, 0.65), 0 0 40px rgba(229, 72, 77, 0.20)',
          },
        },
        blobDrift: {
          '0%':   { transform: 'translate3d(0px, 0px, 0px)' },
          '50%':  { transform: 'translate3d(40px, -30px, 0px)' },
          '100%': { transform: 'translate3d(-25px, 25px, 0px)' },
        },
        blobDrift2: {
          '0%':   { transform: 'translate3d(0px, 0px, 0px)' },
          '50%':  { transform: 'translate3d(-45px, 35px, 0px)' },
          '100%': { transform: 'translate3d(30px, -25px, 0px)' },
        },
        blobDrift3: {
          '0%':   { transform: 'translate3d(0px, 0px, 0px)' },
          '50%':  { transform: 'translate3d(25px, 40px, 0px)' },
          '100%': { transform: 'translate3d(-35px, -20px, 0px)' },
        },
        blobDrift4: {
          '0%':   { transform: 'translate3d(0px, 0px, 0px)' },
          '50%':  { transform: 'translate3d(-30px, -40px, 0px)' },
          '100%': { transform: 'translate3d(35px, 30px, 0px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
