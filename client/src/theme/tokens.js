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

  // Role Accents (dark / light)
  accentDonorDark: '#2DD4BF',
  accentDonorLight: '#0F766E',
  accentHospitalDark: '#60A5FA',
  accentHospitalLight: '#1D6FD6',
  accentAdminDark: '#A78BFA',
  accentAdminLight: '#6D28D9',

  // Urgency Scale (dark / light)
  urgencyCriticalDark: '#E5484D',
  urgencyCriticalLight: '#C8102E',
  urgencyHighDark: '#FB923C',
  urgencyHighLight: '#B45309',
  urgencyMediumDark: '#FBBF24',
  urgencyMediumLight: '#9A5B00',
  urgencyLowDark: '#7DD3FC',
  urgencyLowLight: '#0369A1',

  // Blood-group Family Hues (dark / light)
  aboODark: '#2DD4BF',
  aboOLight: '#0F766E',
  aboADark: '#60A5FA',
  aboALight: '#1D6FD6',
  aboBDark: '#A78BFA',
  aboBLight: '#6D28D9',
  aboABDark: '#FBBF24',
  aboABLight: '#9A5B00',

  // Chart Series
  chartSeriesDark: ['#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6', '#94A3B8'],
  chartSeriesLight: ['#1D6FD6', '#059669', '#B45309', '#6D28D9', '#BE185D', '#475569'],
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

  // Role accents (Dark)
  accentDonor: '#2DD4BF',
  accentDonorSubtle: 'rgba(45, 212, 191, 0.14)',
  accentDonorBorder: 'rgba(45, 212, 191, 0.28)',
  accentHospital: '#60A5FA',
  accentHospitalSubtle: 'rgba(96, 165, 250, 0.14)',
  accentHospitalBorder: 'rgba(96, 165, 250, 0.28)',
  accentAdmin: '#A78BFA',
  accentAdminSubtle: 'rgba(167, 139, 250, 0.14)',
  accentAdminBorder: 'rgba(167, 139, 250, 0.28)',

  // Urgency scale (Dark)
  urgencyCritical: '#E5484D',
  urgencyCriticalSubtle: 'rgba(229, 72, 77, 0.14)',
  urgencyCriticalBorder: 'rgba(229, 72, 77, 0.28)',
  urgencyHigh: '#FB923C',
  urgencyHighSubtle: 'rgba(251, 146, 60, 0.14)',
  urgencyHighBorder: 'rgba(251, 146, 60, 0.28)',
  urgencyMedium: '#FBBF24',
  urgencyMediumSubtle: 'rgba(251, 191, 36, 0.14)',
  urgencyMediumBorder: 'rgba(251, 191, 36, 0.28)',
  urgencyLow: '#7DD3FC',
  urgencyLowSubtle: 'rgba(125, 211, 252, 0.14)',
  urgencyLowBorder: 'rgba(125, 211, 252, 0.28)',

  // Blood-group family hues (Dark)
  aboO: '#2DD4BF',
  aboOSubtle: 'rgba(45, 212, 191, 0.14)',
  aboOBorder: 'rgba(45, 212, 191, 0.28)',
  aboA: '#60A5FA',
  aboASubtle: 'rgba(96, 165, 250, 0.14)',
  aboABorder: 'rgba(96, 165, 250, 0.28)',
  aboB: '#A78BFA',
  aboBSubtle: 'rgba(167, 139, 250, 0.14)',
  aboBBorder: 'rgba(167, 139, 250, 0.28)',
  aboAB: '#FBBF24',
  aboABSubtle: 'rgba(251, 191, 36, 0.14)',
  aboABBorder: 'rgba(251, 191, 36, 0.28)',

  // Chart series (Dark)
  chartSeries: ['#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F472B6', '#94A3B8'],
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

  // Role accents (Light)
  accentDonor: '#0F766E',
  accentDonorSubtle: 'rgba(15, 118, 110, 0.08)',
  accentDonorBorder: 'rgba(15, 118, 110, 0.22)',
  accentHospital: '#1D6FD6',
  accentHospitalSubtle: 'rgba(29, 111, 214, 0.08)',
  accentHospitalBorder: 'rgba(29, 111, 214, 0.22)',
  accentAdmin: '#6D28D9',
  accentAdminSubtle: 'rgba(109, 40, 217, 0.08)',
  accentAdminBorder: 'rgba(109, 40, 217, 0.22)',

  // Urgency scale (Light)
  urgencyCritical: '#C8102E',
  urgencyCriticalSubtle: 'rgba(200, 16, 46, 0.08)',
  urgencyCriticalBorder: 'rgba(200, 16, 46, 0.22)',
  urgencyHigh: '#B45309',
  urgencyHighSubtle: 'rgba(180, 83, 9, 0.07)',
  urgencyHighBorder: 'rgba(180, 83, 9, 0.22)',
  urgencyMedium: '#9A5B00',
  urgencyMediumSubtle: 'rgba(154, 91, 0, 0.08)',
  urgencyMediumBorder: 'rgba(154, 91, 0, 0.22)',
  urgencyLow: '#0369A1',
  urgencyLowSubtle: 'rgba(3, 105, 161, 0.08)',
  urgencyLowBorder: 'rgba(3, 105, 161, 0.22)',

  // Blood-group family hues (Light)
  aboO: '#0F766E',
  aboOSubtle: 'rgba(15, 118, 110, 0.08)',
  aboOBorder: 'rgba(15, 118, 110, 0.22)',
  aboA: '#1D6FD6',
  aboASubtle: 'rgba(29, 111, 214, 0.08)',
  aboABorder: 'rgba(29, 111, 214, 0.22)',
  aboB: '#6D28D9',
  aboBSubtle: 'rgba(109, 40, 217, 0.08)',
  aboBBorder: 'rgba(109, 40, 217, 0.22)',
  aboAB: '#9A5B00',
  aboABSubtle: 'rgba(154, 91, 0, 0.08)',
  aboABBorder: 'rgba(154, 91, 0, 0.22)',

  // Chart series (Light)
  chartSeries: ['#1D6FD6', '#059669', '#B45309', '#6D28D9', '#BE185D', '#475569'],
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
