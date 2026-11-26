import { useTheme } from '../context/ThemeContext';

/**
 * useChartTheme — Purposeful Chart Accent System for Recharts:
 * Harmonized with "Warm Nocturne" (Warm Charcoal + Cream + Coral Ember + Vital Crimson).
 * Light-mode series meet >= 3:1 contrast against surface (#FFFFFF).
 */
export const useChartTheme = () => {
  const { isDark } = useTheme();

  const series = isDark
    ? ['#F29C79', '#34D399', '#FBBF24', '#C4B5FD', '#FF6B7B', '#ACA295']
    : ['#C2410C', '#0F766E', '#A14A08', '#6D28D9', '#BE123C', '#57534E'];

  return {
    isDark,
    series,
    gridStroke: isDark ? 'rgba(255, 245, 235, 0.08)' : 'rgba(28, 25, 23, 0.08)',
    axisStroke: isDark ? '#ACA295' : '#635A52',
    tooltipStyle: {
      backgroundColor: isDark ? 'rgba(29, 26, 23, 0.96)' : 'rgba(255, 255, 255, 0.96)',
      backdropFilter: 'blur(26px) saturate(180%)',
      WebkitBackdropFilter: 'blur(26px) saturate(180%)',
      borderColor: isDark ? 'rgba(255, 245, 235, 0.16)' : 'rgba(28, 25, 23, 0.14)',
      borderRadius: '1rem',
      color: isDark ? '#F6F2EB' : '#1C1917',
      boxShadow: isDark
        ? '0 16px 40px -8px rgba(10, 8, 6, 0.72), inset 0 1px 0 rgba(255, 248, 240, 0.08)'
        : '0 12px 30px rgba(28, 25, 23, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.96)',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 600,
    },
    colors: {
      series,
      info:      isDark ? '#F29C79' : '#B53E12',
      ice:       isDark ? '#F6DFC9' : '#1C1917',
      teal:      isDark ? '#34D399' : '#0F766E',
      success:   isDark ? '#4ADE80' : '#157A3D',
      silver:    isDark ? '#ACA295' : '#57534E',
      warning:   isDark ? '#FBBF24' : '#9A5B00',
      crimson:   isDark ? '#FF6B7B' : '#BE123C',
      danger:    isDark ? '#FF6B7B' : '#BE123C',
      redDeep:   isDark ? '#9F1239' : '#881337',
      redText:   isDark ? '#FDA4AF' : '#BE123C',
      silverDim: isDark ? '#6D655B' : '#A89E94',

      // Role accents
      accentDonor:    isDark ? '#34D399' : '#0B5E58',
      accentHospital: isDark ? '#7DD3FC' : '#075985',
      accentAdmin:    isDark ? '#C4B5FD' : '#6D28D9',

      // Urgency scale
      urgencyCritical: isDark ? '#FF6B7B' : '#BE123C',
      urgencyHigh:     isDark ? '#FB923C' : '#A14A08',
      urgencyMedium:   isDark ? '#FBBF24' : '#9A5B00',
      urgencyLow:      isDark ? '#7DD3FC' : '#0369A1',

      // Backward compatible aliases
      ruby:      isDark ? '#FF6B7B' : '#BE123C',
      violet:    isDark ? '#C4B5FD' : '#6D28D9',
      cyan:      isDark ? '#7DD3FC' : '#0369A1',
      amber:     isDark ? '#FBBF24' : '#9A5B00',
      magenta:   isDark ? '#F472B6' : '#BE123C',
      rose:      isDark ? '#FF6B7B' : '#BE123C',
      roseLight: isDark ? '#FDA4AF' : '#BE123C',
      sky:       isDark ? '#7DD3FC' : '#0369A1',
      slate:     isDark ? '#ACA295' : '#57534E',
    },
  };
};

export default useChartTheme;
