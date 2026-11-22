export const colors = {
  bgPrimary: '#0B0E14',
  bgSecondary: '#151922',
  bgTertiary: '#1E2330',
  accentPrimary: '#3B82F6',
  accentEmerald: '#10B981',
  accentRose: '#F43F5E',
  accentAmber: '#F59E0B',
  accentPurple: '#8B5CF6',
  textMain: '#F8FAFC',
  textMuted: '#94A3B8',
  textDim: '#64748B',
  borderColor: 'rgba(255, 255, 255, 0.08)',
};

export const formatINR = (amt) => {
  const num = parseFloat(amt || 0);
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

