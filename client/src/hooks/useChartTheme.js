import { useTheme } from '../context/ThemeContext';

/**
 * useChartTheme — "Midnight Navy + Crimson + Ice" tokens for Recharts:
 * Default series: info, ice, teal (success), silver; reserve crimson strictly
 * for critical data only (shortages, unfulfilled urgent requests).
 */
export const useChartTheme = () => {
  const { isDark } = useTheme();

  return {
    isDark,
    gridStroke: isDark ? 'rgba(147, 161, 189, 0.12)' : 'rgba(15, 26, 46, 0.08)',
    axisStroke: isDark ? '#9DAAC6' : '#4A5A78',
    tooltipStyle: {
      backgroundColor: isDark ? 'rgba(17, 26, 46, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(26px) saturate(180%)',
      WebkitBackdropFilter: 'blur(26px) saturate(180%)',
      borderColor: isDark ? 'rgba(147, 161, 189, 0.20)' : 'rgba(15, 26, 46, 0.15)',
      borderRadius: '1rem',
      color: isDark ? '#E8EEF9' : '#0F1A2E',
      boxShadow: isDark
        ? '0 16px 40px -8px rgba(0, 0, 0, 0.75), 0 0 20px rgba(96, 165, 250, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
        : '0 12px 30px rgba(15, 26, 46, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
      padding: '10px 14px',
      fontSize: '12px',
      fontWeight: 600,
    },
    colors: {
      info:      isDark ? '#60A5FA' : '#1D6FD6',
      ice:       isDark ? '#A5D8FF' : '#1D6FD6',
      teal:      isDark ? '#34D399' : '#0A7A62',
      success:   isDark ? '#34D399' : '#0A7A62',
      silver:    isDark ? '#9DAAC6' : '#4A5A78',
      warning:   isDark ? '#FBBF24' : '#9A5B00',
      crimson:   isDark ? '#E5484D' : '#C8102E', // critical / shortage only
      danger:    isDark ? '#E5484D' : '#C8102E',
      redDeep:   isDark ? '#B82C30' : '#8A0A1F',
      redText:   isDark ? '#FF6166' : '#C8102E',
      silverDim: isDark ? '#4A5A78' : '#9DAAC6',

      // Backward compatible aliases
      ruby:      isDark ? '#E5484D' : '#C8102E',
      violet:    isDark ? '#60A5FA' : '#1D6FD6',
      cyan:      isDark ? '#A5D8FF' : '#1D6FD6',
      amber:     isDark ? '#FBBF24' : '#9A5B00',
      magenta:   isDark ? '#E5484D' : '#C8102E',
      rose:      isDark ? '#E5484D' : '#C8102E',
      roseLight: isDark ? '#FF6166' : '#C8102E',
      sky:       isDark ? '#A5D8FF' : '#1D6FD6',
      slate:     isDark ? '#9DAAC6' : '#4A5A78',
    },
  };
};

export default useChartTheme;
