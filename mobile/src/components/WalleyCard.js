import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  Path,
} from 'react-native-svg';
import { Wifi, Eye, EyeOff } from 'lucide-react-native';
import { formatCurrency } from '../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = 220;

export default function WalleyCard({
  theme,
  balance = 1200.82,
  cardHolder = 'Arya Wijaya',
  cardNumber = '**** **** 2880',
  expiry = '11/24',
  variant = 'blue', // 'blue' | 'cyan' | 'purple' | 'dark'
  accountName = 'Primary Account',
  institutionName = 'Citi Bank',
  accountType = 'SAVINGS',
  onPress,
  onViewAccounts,
  onViewTransactions,
}) {
  const [balanceHidden, setBalanceHidden] = useState(false);
  const gradientConfigs = {
    blue: {
      from: '#4361EE',
      to: '#3A0CA3',
      circle1: 'rgba(255, 255, 255, 0.12)',
      circle2: 'rgba(72, 149, 239, 0.25)',
    },
    cyan: {
      from: '#00B4D8',
      to: '#0077B6',
      circle1: 'rgba(255, 255, 255, 0.15)',
      circle2: 'rgba(144, 224, 239, 0.3)',
    },
    purple: {
      from: '#7209B7',
      to: '#3A0CA3',
      circle1: 'rgba(255, 255, 255, 0.12)',
      circle2: 'rgba(247, 37, 133, 0.2)',
    },
    dark: {
      from: '#1E293B',
      to: '#0F172A',
      circle1: 'rgba(255, 255, 255, 0.08)',
      circle2: 'rgba(51, 65, 85, 0.25)',
    },
  };

  const conf = gradientConfigs[variant] || gradientConfigs.blue;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.cardContainer, theme.floatingShadow]}
    >
      {/* Background SVG — rendered first, sits at z=0 */}
      <Svg
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
        style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
      >
        <Defs>
          <LinearGradient id={`cardGrad-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={conf.from} stopOpacity="1" />
            <Stop offset="100%" stopColor={conf.to} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <Rect
          x="0"
          y="0"
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          rx="22"
          fill={`url(#cardGrad-${variant})`}
        />

        {/* Ambient background decorative circles & waves */}
        <Circle cx={CARD_WIDTH - 20} cy={20} r="90" fill={conf.circle1} />
        <Circle cx={CARD_WIDTH + 10} cy={CARD_HEIGHT - 30} r="120" fill={conf.circle2} />
        <Path
          d={`M -20 ${CARD_HEIGHT * 0.4} Q ${CARD_WIDTH * 0.4} ${CARD_HEIGHT * 0.8} ${CARD_WIDTH + 20} ${CARD_HEIGHT * 0.3}`}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="30"
          fill="none"
        />
      </Svg>

      {/* Card Content Overlay — absolutely positioned on top at z=1 */}
      <View style={styles.cardContent}>
        {/* Top Row: Account Type/Institution + Eye toggle */}
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountTypeLabel}>
              {accountType.replace(/_/g, ' ')} • {institutionName}
            </Text>
            <Text style={styles.cardHolderName}>{accountName}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setBalanceHidden((v) => !v)}
            style={styles.eyeBtn}
            activeOpacity={0.7}
          >
            {balanceHidden
              ? <EyeOff size={18} color="rgba(255,255,255,0.85)" />
              : <Eye size={18} color="rgba(255,255,255,0.85)" />
            }
          </TouchableOpacity>
        </View>

        {/* Middle: Combined Balance */}
        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceLabel}>Combined Balance</Text>
            <Text style={styles.balanceAmount}>
              {balanceHidden ? '••••••' : formatCurrency(balance)}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.dividerLine} />

        {/* Bottom Row: View Accounts + Transactions links */}
        <View style={styles.bottomRow}>
          <TouchableOpacity onPress={onViewAccounts} activeOpacity={0.75}>
            <Text style={styles.cardLink}>View Accounts</Text>
            <View style={styles.linkUnderline} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onViewTransactions} activeOpacity={0.75}>
            <Text style={styles.cardLink}>Transactions</Text>
            <View style={styles.linkUnderline} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 22,
    alignSelf: 'center',
    marginVertical: 12,
    overflow: 'hidden',
  },
  cardContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  accountTypeLabel: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  cardHolderName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  eyeBtn: {
    padding: 4,
    marginTop: 2,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLink: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  linkUnderline: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
});
