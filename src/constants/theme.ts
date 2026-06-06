/**
 * ============================================================
 *  VOCALIS DESIGN SYSTEM — CHANGE COLORS AND FONTS HERE
 * ============================================================
 *
 *  Every screen imports from this file.
 *  To retheme the entire app:
 *    - Change COLORS values (hex or rgba strings)
 *    - Change FONTS fontWeight/fontFamily values
 *    - Change RADIUS for corner rounding
 *    - Change SPACE for spacing density
 *
 *  Current theme: Headspace-inspired light — cream/white backgrounds,
 *  slate text, blue/purple primary (#5B8CDB).
 *  Replace primary (#5B8CDB) with your brand color and adjust
 *  bg/surface accordingly.
 * ============================================================
 */
export const COLORS = {
  bg: '#FFFFFF',
  surface: '#FDF5EB',
  surfaceHi: '#F5ECD8',
  surfaceHover: '#EDE3CE',
  primary: '#5B8CDB',
  primaryLight: '#7BA7E8',
  primaryDark: '#3D6FBF',
  accent: '#7C6FCD',
  accentGreen: '#7DC9A8',
  accentAmber: '#5B8CDB',
  text: '#2D2D2D',
  textSub: '#4B5161',
  textMuted: '#9298A8',
  border: 'rgba(75,81,97,0.12)',
  borderBright: 'rgba(91,140,219,0.35)',
  success: '#7DC9A8',
  warning: '#5B8CDB',
  danger: '#E05A3A',
};

export const FONTS = {
  heading: { fontWeight: '700' as const },
  subheading: { fontWeight: '600' as const },
  body: { fontWeight: '400' as const },
  mono: { fontFamily: 'monospace' as const },
};

export const RADIUS = { sm: 8, md: 12, lg: 18, xl: 24, full: 999 };
export const SPACE = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
