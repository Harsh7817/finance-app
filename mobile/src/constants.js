import { walleyTheme, formatCurrency, formatShortCurrency } from './theme';

export { walleyTheme, formatCurrency, formatShortCurrency };

export const colors = {
  // Walley Light Defaults
  primary: walleyTheme.light.primary,
  primaryDark: walleyTheme.light.primaryDark,
  primaryLight: walleyTheme.light.primaryLight,
  primarySoft: walleyTheme.light.primarySoft,
  
  bgPrimary: walleyTheme.light.bg,
  bgSecondary: walleyTheme.light.bgSecondary,
  bgTertiary: walleyTheme.light.surfaceAlt,
  
  textMain: walleyTheme.light.textPrimary,
  textMuted: walleyTheme.light.textMuted,
  textDim: walleyTheme.light.textDim,
  borderColor: walleyTheme.light.border,
  
  accentPrimary: walleyTheme.light.primary,
  accentEmerald: walleyTheme.light.accentEmerald,
  accentRose: walleyTheme.light.accentRose,
  accentAmber: walleyTheme.light.accentAmber,
  accentPurple: walleyTheme.light.accentPurple,
  accentCyan: walleyTheme.light.accentCyan,
};

export const formatINR = (amt) => formatCurrency(amt, 'USD');
