export const walleyTheme = {
  light: {
    isDark: false,
    primary: '#4361EE',
    primaryDark: '#3A0CA3',
    primaryLight: '#4895EF',
    primarySoft: '#EEF2FF',
    primarySoftHover: '#E0E7FF',
    primaryBorder: 'rgba(67, 97, 238, 0.2)',
    
    // Backgrounds & Surfaces
    bg: '#F8FAFD',
    bgSecondary: '#F1F4F9',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceAlt: '#F4F6FC',
    inputBg: '#F1F4F9',
    inputBorder: '#E2E8F0',
    
    // Text colors
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    textDim: '#94A3B8',
    textWhite: '#FFFFFF',

    // Accents & Statuses
    accentEmerald: '#10B981',
    accentRose: '#F43F5E',
    accentAmber: '#F59E0B',
    accentCyan: '#06D6A0',
    accentBlue: '#38B6FF',
    accentPurple: '#8B5CF6',
    
    // Borders & Lines
    border: '#E8EEF5',
    borderLight: '#F1F5F9',
    divider: '#E2E8F0',

    // Card Gradients
    cardGradients: {
      primary: ['#4361EE', '#3A0CA3'],
      cyan: ['#00B4D8', '#0077B6'],
      purple: ['#7209B7', '#3A0CA3'],
      dark: ['#1E293B', '#0F172A'],
    },
    
    // Shadows
    cardShadow: {
      shadowColor: '#4361EE',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    cardShadowSoft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    floatingShadow: {
      shadowColor: '#4361EE',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 8,
    },
  },
  dark: {
    isDark: true,
    primary: '#4361EE',
    primaryDark: '#2F3CB3',
    primaryLight: '#5A78FF',
    primarySoft: 'rgba(67, 97, 238, 0.16)',
    primarySoftHover: 'rgba(67, 97, 238, 0.25)',
    primaryBorder: 'rgba(67, 97, 238, 0.3)',
    
    // Backgrounds & Surfaces
    bg: '#0D111D',
    bgSecondary: '#131826',
    surface: '#161D2F',
    surfaceElevated: '#1C243A',
    surfaceAlt: '#1F293D',
    inputBg: '#1A2133',
    inputBorder: 'rgba(255, 255, 255, 0.08)',
    
    // Text colors
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    textDim: '#64748B',
    textWhite: '#FFFFFF',

    // Accents & Statuses
    accentEmerald: '#10B981',
    accentRose: '#F43F5E',
    accentAmber: '#F59E0B',
    accentCyan: '#06D6A0',
    accentBlue: '#38B6FF',
    accentPurple: '#A78BFA',
    
    // Borders & Lines
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.04)',
    divider: 'rgba(255, 255, 255, 0.06)',

    // Card Gradients
    cardGradients: {
      primary: ['#4361EE', '#3A0CA3'],
      cyan: ['#0077B6', '#03045E'],
      purple: ['#5A189A', '#240046'],
      dark: ['#1C243A', '#0D111D'],
    },
    
    // Shadows
    cardShadow: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 4,
    },
    cardShadowSoft: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
    floatingShadow: {
      shadowColor: '#4361EE',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};

export const formatCurrency = (amt, currency = 'USD') => {
  const num = parseFloat(amt || 0);
  if (currency === 'INR') {
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: num % 1 === 0 ? 0 : 2 });
  }
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatShortCurrency = (amt, currency = 'USD') => {
  const num = parseFloat(amt || 0);
  const symbol = currency === 'INR' ? '₹' : '$';
  if (Math.abs(num) >= 1000000) {
    return `${symbol}${(num / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `${symbol}${(num / 1000).toFixed(1)}k`;
  }
  return `${symbol}${num.toFixed(0)}`;
};
