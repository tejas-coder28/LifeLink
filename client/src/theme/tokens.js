/**
 * LifeLink Central Design Tokens — "Warm Nocturne + Vital Rose-Crimson + Coral Ember"
 *
 * Direction:
 *   Warm editorial precision inspired by tactile studio dark/cream systems.
 *   Crimson/Rose is reserved strictly for emergency blood demand and critical status (<= 10%).
 *   Dark: Matte Warm Charcoal (#141210) with smoked espresso-slate cards (#1D1A17) and warm ivory ink (#F6F2EB).
 *   Light: Warm Cream Alabaster (#FAF7F2) with pure porcelain surfaces (#FFFFFF) and charcoal ink (#1C1917).
 */

export const PALETTE = {
  // Warm Foundations
  midnight: '#141210',
  canvasLight: '#FAF7F2',
  // Emergency Signal Crimson
  crimsonDark: '#FF6B7B',
  crimsonSolidDark: '#C81D3B',
  crimsonHoverDark: '#E11D48',
  crimsonPressedDark: '#9F1239',
  crimsonLight: '#BE123C',
  crimsonHoverLight: '#9F1239',
  crimsonPressedLight: '#881337',
  // Warm Highlights & Neutrals
  ice: '#F6DFC9',
  royalBlue: '#27231F',
  silverBlue: '#ACA295',
  // Primary Action (Warm Ivory Dark / Espresso Charcoal Light)
  actionDark: '#F6F2EB',
  actionHoverDark: '#FFFFFF',
  actionLight: '#1C1917',
  actionHoverLight: '#2E2925',
  // Semantic
  successDark: '#4ADE80',
  successSolidDark: '#157A3D',
  successHoverDark: '#16A34A',
  successLight: '#157A3D',
  successSolidLight: '#157A3D',
  successHoverLight: '#166534',
  warningDark: '#FBBF24',
  warningLight: '#9A5B00',
  infoDark: '#F29C79',
  infoLight: '#B53E12',
  white: '#FFFFFF',

  // Role Accents (dark / light)
  accentDonorDark: '#34D399',
  accentDonorLight: '#0B5E58',
  accentHospitalDark: '#7DD3FC',
  accentHospitalLight: '#075985',
  accentAdminDark: '#C4B5FD',
  accentAdminLight: '#6D28D9',

  // Urgency Scale (dark / light)
  urgencyCriticalDark: '#FF6B7B',
  urgencyCriticalLight: '#BE123C',
  urgencyHighDark: '#FB923C',
  urgencyHighLight: '#A14A08',
  urgencyMediumDark: '#FBBF24',
  urgencyMediumLight: '#9A5B00',
  urgencyLowDark: '#7DD3FC',
  urgencyLowLight: '#0369A1',

  // Blood-group Family Hues (dark / light)
  aboODark: '#34D399',
  aboOLight: '#0B5E58',
  aboADark: '#7DD3FC',
  aboALight: '#075985',
  aboBDark: '#C4B5FD',
  aboBLight: '#6D28D9',
  aboABDark: '#FBBF24',
  aboABLight: '#9A5B00',

  // Chart Series
  chartSeriesDark: ['#F29C79', '#34D399', '#FBBF24', '#C4B5FD', '#FF6B7B', '#ACA295'],
  chartSeriesLight: ['#C2410C', '#0F766E', '#A14A08', '#6D28D9', '#BE123C', '#57534E'],
};

export const dark = {
  canvas: '#141210',
  surface: '#1D1A17',
  raised: '#27231F',
  overlay: '#312C27',
  textPrimary: '#F6F2EB',
  textMuted: '#ACA295',
  hairline: 'rgba(255, 245, 235, 0.10)',
  hairlineStrong: 'rgba(255, 245, 235, 0.18)',
  specularRim: 'rgba(255, 248, 240, 0.12)',
  danger: '#FF6B7B',
  dangerSolid: '#C81D3B',
  dangerHover: '#E11D48',
  dangerPressed: '#9F1239',
  success: '#4ADE80',
  warning: '#FBBF24',
  info: '#F29C79',
  focus: '#F29C79',
  ice: '#F6DFC9',
  glassBg: 'rgba(29, 26, 23, 0.90)',
  glassBgRaised: '#27231F',
  glassBorder: 'rgba(255, 245, 235, 0.10)',

  // Role accents (Dark)
  accentDonor: '#34D399',
  accentDonorSubtle: 'rgba(52, 211, 153, 0.14)',
  accentDonorBorder: 'rgba(52, 211, 153, 0.28)',
  accentHospital: '#7DD3FC',
  accentHospitalSubtle: 'rgba(125, 211, 252, 0.14)',
  accentHospitalBorder: 'rgba(125, 211, 252, 0.28)',
  accentAdmin: '#C4B5FD',
  accentAdminSubtle: 'rgba(196, 181, 253, 0.14)',
  accentAdminBorder: 'rgba(196, 181, 253, 0.28)',

  // Urgency scale (Dark)
  urgencyCritical: '#FF6B7B',
  urgencyCriticalSubtle: 'rgba(255, 107, 123, 0.14)',
  urgencyCriticalBorder: 'rgba(255, 107, 123, 0.30)',
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
  aboO: '#34D399',
  aboOSubtle: 'rgba(52, 211, 153, 0.14)',
  aboOBorder: 'rgba(52, 211, 153, 0.28)',
  aboA: '#7DD3FC',
  aboASubtle: 'rgba(125, 211, 252, 0.14)',
  aboABorder: 'rgba(125, 211, 252, 0.28)',
  aboB: '#C4B5FD',
  aboBSubtle: 'rgba(196, 181, 253, 0.14)',
  aboBBorder: 'rgba(196, 181, 253, 0.28)',
  aboAB: '#FBBF24',
  aboABSubtle: 'rgba(251, 191, 36, 0.14)',
  aboABBorder: 'rgba(251, 191, 36, 0.28)',

  // Chart series (Dark)
  chartSeries: ['#F29C79', '#34D399', '#FBBF24', '#C4B5FD', '#FF6B7B', '#ACA295'],
};

export const light = {
  canvas: '#FAF7F2',
  surface: '#FFFFFF',
  raised: '#F0EBE2',
  overlay: '#FFFFFF',
  textPrimary: '#1C1917',
  textMuted: '#635A52',
  hairline: 'rgba(28, 25, 23, 0.10)',
  hairlineStrong: 'rgba(28, 25, 23, 0.19)',
  specularRim: 'rgba(255, 255, 255, 0.96)',
  danger: '#BE123C',
  dangerSolid: '#BE123C',
  dangerHover: '#9F1239',
  dangerPressed: '#881337',
  success: '#157A3D',
  warning: '#9A5B00',
  info: '#B53E12',
  focus: '#B53E12',
  ice: '#1C1917',
  glassBg: 'rgba(255, 255, 255, 0.88)',
  glassBgRaised: '#FFFFFF',
  glassBorder: 'rgba(28, 25, 23, 0.10)',

  // Role accents (Light)
  accentDonor: '#0B5E58',
  accentDonorSubtle: 'rgba(11, 94, 88, 0.08)',
  accentDonorBorder: 'rgba(11, 94, 88, 0.24)',
  accentHospital: '#075985',
  accentHospitalSubtle: 'rgba(7, 89, 133, 0.08)',
  accentHospitalBorder: 'rgba(7, 89, 133, 0.24)',
  accentAdmin: '#6D28D9',
  accentAdminSubtle: 'rgba(109, 40, 217, 0.08)',
  accentAdminBorder: 'rgba(109, 40, 217, 0.22)',

  // Urgency scale (Light)
  urgencyCritical: '#BE123C',
  urgencyCriticalSubtle: 'rgba(190, 18, 60, 0.08)',
  urgencyCriticalBorder: 'rgba(190, 18, 60, 0.22)',
  urgencyHigh: '#A14A08',
  urgencyHighSubtle: 'rgba(161, 74, 8, 0.08)',
  urgencyHighBorder: 'rgba(161, 74, 8, 0.22)',
  urgencyMedium: '#9A5B00',
  urgencyMediumSubtle: 'rgba(154, 91, 0, 0.08)',
  urgencyMediumBorder: 'rgba(154, 91, 0, 0.22)',
  urgencyLow: '#0369A1',
  urgencyLowSubtle: 'rgba(3, 105, 161, 0.08)',
  urgencyLowBorder: 'rgba(3, 105, 161, 0.22)',

  // Blood-group family hues (Light)
  aboO: '#0B5E58',
  aboOSubtle: 'rgba(11, 94, 88, 0.08)',
  aboOBorder: 'rgba(11, 94, 88, 0.24)',
  aboA: '#075985',
  aboASubtle: 'rgba(7, 89, 133, 0.08)',
  aboABorder: 'rgba(7, 89, 133, 0.24)',
  aboB: '#6D28D9',
  aboBSubtle: 'rgba(109, 40, 217, 0.08)',
  aboBBorder: 'rgba(109, 40, 217, 0.22)',
  aboAB: '#9A5B00',
  aboABSubtle: 'rgba(154, 91, 0, 0.08)',
  aboABBorder: 'rgba(154, 91, 0, 0.22)',

  // Chart series (Light)
  chartSeries: ['#C2410C', '#0F766E', '#A14A08', '#6D28D9', '#BE123C', '#57534E'],
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
