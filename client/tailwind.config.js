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
        'on-primary': 'var(--on-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        hairline: 'var(--hairline)',

        // Semantic states
        action: {
          DEFAULT: 'var(--action-solid)',
          hover: 'var(--action-hover)',
          pressed: 'var(--action-pressed)',
          fg: 'var(--action-fg)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          solid: 'var(--danger-solid)',
          hover: 'var(--danger-hover)',
          pressed: 'var(--danger-pressed)',
          text: 'var(--red-text)',
        },
        success: {
          DEFAULT: 'var(--success)',
          solid: 'var(--success-solid)',
          hover: 'var(--success-hover)',
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
          DEFAULT: '#141210',
          950: '#141210',
          900: '#1D1A17',
          850: '#27231F',
          800: '#312C27',
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
          critical: 'var(--urgency-critical)',
          'critical-subtle': 'var(--urgency-critical-subtle)',
          'critical-border': 'var(--urgency-critical-border)',
          high:     'var(--urgency-high)',
          'high-subtle': 'var(--urgency-high-subtle)',
          'high-border': 'var(--urgency-high-border)',
          medium:   'var(--urgency-medium)',
          'medium-subtle': 'var(--urgency-medium-subtle)',
          'medium-border': 'var(--urgency-medium-border)',
          low:      'var(--urgency-low)',
          'low-subtle': 'var(--urgency-low-subtle)',
          'low-border': 'var(--urgency-low-border)',
        },
        'urgency-critical': 'var(--urgency-critical)',
        'urgency-critical-subtle': 'var(--urgency-critical-subtle)',
        'urgency-critical-border': 'var(--urgency-critical-border)',
        'urgency-high': 'var(--urgency-high)',
        'urgency-high-subtle': 'var(--urgency-high-subtle)',
        'urgency-high-border': 'var(--urgency-high-border)',
        'urgency-medium': 'var(--urgency-medium)',
        'urgency-medium-subtle': 'var(--urgency-medium-subtle)',
        'urgency-medium-border': 'var(--urgency-medium-border)',
        'urgency-low': 'var(--urgency-low)',
        'urgency-low-subtle': 'var(--urgency-low-subtle)',
        'urgency-low-border': 'var(--urgency-low-border)',

        // Role accents
        'accent-donor': {
          DEFAULT: 'var(--accent-donor)',
          subtle: 'var(--accent-donor-subtle)',
          border: 'var(--accent-donor-border)',
        },
        'accent-hospital': {
          DEFAULT: 'var(--accent-hospital)',
          subtle: 'var(--accent-hospital-subtle)',
          border: 'var(--accent-hospital-border)',
        },
        'accent-admin': {
          DEFAULT: 'var(--accent-admin)',
          subtle: 'var(--accent-admin-subtle)',
          border: 'var(--accent-admin-border)',
        },

        // Blood-group family hues
        abo: {
          o: 'var(--abo-o)',
          'o-subtle': 'var(--abo-o-subtle)',
          'o-border': 'var(--abo-o-border)',
          a: 'var(--abo-a)',
          'a-subtle': 'var(--abo-a-subtle)',
          'a-border': 'var(--abo-a-border)',
          b: 'var(--abo-b)',
          'b-subtle': 'var(--abo-b-subtle)',
          'b-border': 'var(--abo-b-border)',
          ab: 'var(--abo-ab)',
          'ab-subtle': 'var(--abo-ab-subtle)',
          'ab-border': 'var(--abo-ab-border)',
        },
        'abo-o': 'var(--abo-o)',
        'abo-o-subtle': 'var(--abo-o-subtle)',
        'abo-o-border': 'var(--abo-o-border)',
        'abo-a': 'var(--abo-a)',
        'abo-a-subtle': 'var(--abo-a-subtle)',
        'abo-a-border': 'var(--abo-a-border)',
        'abo-b': 'var(--abo-b)',
        'abo-b-subtle': 'var(--abo-b-subtle)',
        'abo-b-border': 'var(--abo-b-border)',
        'abo-ab': 'var(--abo-ab)',
        'abo-ab-subtle': 'var(--abo-ab-subtle)',
        'abo-ab-border': 'var(--abo-ab-border)',

        // Chart series
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
          6: 'var(--chart-6)',
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
        'elevation-overlay':  '0 24px 64px -8px rgba(10, 8, 6, 0.85), var(--glass-specular)',

        card:          'var(--shadow-card)',
        'card-hover':  'var(--shadow-card-hover)',
        elevated:      'var(--shadow-elevated)',

        'glow-crimson':  '0 0 24px -4px rgba(217, 59, 78, 0.42)',
        'glow-danger':   '0 0 24px -4px rgba(217, 59, 78, 0.42)',
        'glow-info':     '0 0 24px -4px rgba(242, 156, 121, 0.35)',
        'glow-ice':      '0 0 24px -4px rgba(246, 223, 201, 0.28)',
        'glow-success':  '0 0 24px -4px rgba(74, 222, 128, 0.32)',
        'glow-warning':  '0 0 24px -4px rgba(251, 191, 36, 0.32)',

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
