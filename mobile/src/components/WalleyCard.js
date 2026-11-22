import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  Path,
} from 'react-native-svg';
import { Wifi } from 'lucide-react-native';
import { formatCurrency } from '../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = 200;

export default function WalleyCard({
  theme,
  balance = 1200.82,
  cardHolder = 'Arya Wijaya',
  cardNumber = '**** **** 2880',
  expiry = '11/24',
  variant = 'blue', // 'blue' | 'cyan' | 'purple' | 'dark'
  onPress,
}) {
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
      {/* Background SVG with smooth gradients & decorative curves */}
      <Svg
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
        style={StyleSheet.absoluteFillObject}
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

      {/* Card Content Overlay */}
      <View style={styles.cardContent}>
        {/* Top Card Row: Name, Chip & Contactless */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.cardHolderLabel}>Name</Text>
            <Text style={styles.cardHolderName}>{cardHolder}</Text>
          </View>
          <View style={styles.chipRow}>
            {/* Contactless waves */}
            <Wifi size={18} color="rgba(255, 255, 255, 0.85)" style={{ transform: [{ rotate: '90deg' }] }} />
            {/* Realistic EMV Card Chip */}
            <View style={styles.chip}>
              <View style={styles.chipInner} />
            </View>
          </View>
        </View>

        {/* Card Number */}
        <View style={styles.numberRow}>
          <Text style={styles.cardNumber}>{cardNumber}</Text>
        </View>

        {/* Bottom Card Row: Balance & Expiry & Mastercard Circles */}
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.balanceLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          </View>

          <View style={styles.rightBottom}>
            <View style={styles.expiryBox}>
              <Text style={styles.expiryLabel}>EXP</Text>
              <Text style={styles.expiryValue}>{expiry}</Text>
            </View>
            {/* Mastercard overlapping rings logo */}
            <View style={styles.mastercardLogo}>
              <View style={[styles.mcCircle, { backgroundColor: 'rgba(235, 0, 27, 0.88)' }]} />
              <View style={[styles.mcCircle, { backgroundColor: 'rgba(247, 158, 27, 0.88)', marginLeft: -10 }]} />
            </View>
          </View>
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
    flex: 1,
    padding: 22,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHolderLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHolderName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chip: {
    width: 34,
    height: 26,
    borderRadius: 5,
    backgroundColor: '#E5C07B',
    borderWidth: 1,
    borderColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInner: {
    width: 22,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#B8860B',
  },
  numberRow: {
    marginVertical: 4,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 2.5,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  rightBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  expiryBox: {
    alignItems: 'flex-end',
  },
  expiryLabel: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 9,
    fontWeight: '600',
  },
  expiryValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  mastercardLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mcCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
});
