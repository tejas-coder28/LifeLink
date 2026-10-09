import { useTheme } from '../context/ThemeContext';

/**
 * useChartTheme — Provides reactive liquid glass styling tokens for Recharts.
 * Adapts tooltips, axes, and grids seamlessly across dark and light modes.
 */
export const useChartTheme = () => {
  const { isDark } = useTheme();

  return {
    isDark,
    gridStroke: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.08)',
    axisStroke: isDark ? '#94A3B8' : '#64748B',
    tooltipStyle: {
      backgroundColor: isDark ? 'rgba(20, 31, 54, 0.92)' : 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(203, 213, 225, 0.85)',
      borderRadius: '1rem',
      color: isDark ? '#F0F6FF' : '#0F172A',
      boxShadow: isDark
        ? '0 12px 36px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
        : '0 12px 30px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 600,
    },
    colors: {
      rose:   '#F43F5E',
      roseLight: '#FB7185',
      teal:   '#2DD4BF',
      sky:    '#38BDF8',
      violet: '#8B5CF6',
      amber:  '#F59E0B',
      slate:  isDark ? '#64748B' : '#94A3B8',
    },
  };
};

export default useChartTheme;
