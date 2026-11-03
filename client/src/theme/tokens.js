/**
 * LifeLink Central Design Tokens — "Midnight Navy + Crimson + Ice"
 * 
 * Direction:
 *   Clinical, trustworthy, calm. Crimson is the emergency signal and must stay rare (<=10%).
 *   Dark: Midnight Navy foundation (#0A0F1C) with ice blue accents and semantic states.
 *   Light: Clean clinical pearl-slate foundation (#F4F7FB) with deep navy typography.
 */

export const PALETTE = {
  // Midnight Navy base
  midnight: '#0A0F1C',
  canvasLight: '#F4F7FB',
  // Danger / Emergency Crimson
  crimsonDark: '#E5484D',
  crimsonSolidDark: '#D13438',
  crimsonHoverDark: '#FF6166',
  crimsonPressedDark: '#B82C30',
  crimsonLight: '#C8102E',
  crimsonHoverLight: '#A80D26',
  crimsonPressedLight: '#8A0A1F',
  // Ice & Blues
  ice: '#A5D8FF',
  royalBlue: '#2B4C8C',
  silverBlue: '#93A1BD',
  // Semantic
  successDark: '#34D399',
  successLight: '#0A7A62',
  warningDark: '#FBBF24',
  warningLight: '#9A5B00',
  infoDark: '#60A5FA',
  infoLight: '#1D6FD6',
  white: '#FFFFFF',
};

export const dark = {
  canvas: '#0A0F1C',
  surface: '#111A2E',
  raised: '#18233D',
  overlay: '#1F2C4A',
  textPrimary: '#E8EEF9',
  textMuted: '#9DAAC6',
  hairline: 'rgba(147, 161, 189, 0.16)',
  hairlineStrong: 'rgba(147, 161, 189, 0.28)',
  specularRim: 'rgba(255, 255, 255, 0.08)',
  danger: '#E5484D',
  dangerSolid: '#D13438',
  dangerHover: '#FF6166',
  dangerPressed: '#B82C30',
  success: '#34D399',
  warning: '#FBBF24',
  info: '#60A5FA',
  focus: '#60A5FA',
  ice: '#A5D8FF',
  glassBg: 'rgba(147, 180, 255, 0.05)',
  glassBgRaised: 'rgba(147, 180, 255, 0.08)',
  glassBorder: 'rgba(147, 161, 189, 0.16)',
};

export const light = {
  canvas: '#F4F7FB',
  surface: '#FFFFFF',
  raised: '#E9EFF7',
  overlay: '#FFFFFF',
  textPrimary: '#0F1A2E',
  textMuted: '#4A5A78',
  hairline: 'rgba(15, 26, 46, 0.12)',
  hairlineStrong: 'rgba(15, 26, 46, 0.22)',
  specularRim: 'rgba(255, 255, 255, 0.90)',
  danger: '#C8102E',
  dangerSolid: '#C8102E',
  dangerHover: '#A80D26',
  dangerPressed: '#8A0A1F',
  success: '#0A7A62',
  warning: '#9A5B00',
  info: '#1D6FD6',
  focus: '#1D6FD6',
  ice: '#1D6FD6',
  glassBg: 'rgba(255, 255, 255, 0.75)',
  glassBgRaised: '#FFFFFF',
  glassBorder: 'rgba(15, 26, 46, 0.12)',
};

// Aliases for backwards compatibility with any direct DARK_TOKENS / LIGHT_TOKENS imports
export const DARK_TOKENS = {
  bg: dark.canvas,
  surface: dark.surface,
  surfaceRaised: dark.raised,
  surfaceCard: dark.surface,
  border: dark.hairline,
  borderStrong: dark.hairlineStrong,
  text: dark.textPrimary,
  textHeading: dark.textPrimary,
  textSecondary: dark.textMuted,
  textMuted: dark.textMuted,
  red: dark.danger,
  danger: dark.danger,
  dangerSolid: dark.dangerSolid,
  success: dark.success,
  warning: dark.warning,
  info: dark.info,
  ice: dark.ice,
  focusRing: dark.focus,
};

export const LIGHT_TOKENS = {
  bg: light.canvas,
  surface: light.surface,
  surfaceRaised: light.raised,
  surfaceCard: light.surface,
  border: light.hairline,
  borderStrong: light.hairlineStrong,
  text: light.textPrimary,
  textHeading: light.textPrimary,
  textSecondary: light.textMuted,
  textMuted: light.textMuted,
  red: light.danger,
  danger: light.danger,
  dangerSolid: light.dangerSolid,
  success: light.success,
  warning: light.warning,
  info: light.info,
  ice: light.ice,
  focusRing: light.focus,
};

export default {
  PALETTE,
  dark,
  light,
  DARK_TOKENS,
  LIGHT_TOKENS,
};
