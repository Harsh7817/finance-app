import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Check, Star } from 'lucide-react-native';
import { formatCurrency } from '../theme';

const { width, height } = Dimensions.get('window');

export default function TransferSuccessScreen({
  theme,
  transferData,
  onBackToHome,
}) {
  const payee = transferData?.payee?.name || 'Arya Wijaya';
  const amount = transferData?.amount || 275.0;

  return (
    <View style={styles.container}>
      {/* Full Royal Blue Gradient with SVG Waves (Matching Image 1 Transfer Success) */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4361EE" />
            <Stop offset="50%" stopColor="#3F37C9" />
            <Stop offset="100%" stopColor="#3A0CA3" />
          </LinearGradient>
        </Defs>
        <Circle cx={width * 0.9} cy={height * 0.25} r={180} fill="rgba(255, 255, 255, 0.08)" />
        <Circle cx={width * 0.1} cy={height * 0.75} r={220} fill="rgba(72, 149, 239, 0.2)" />
        {/* Flowing curve line matching design */}
        <Path
          d={`M -50 ${height * 0.3} Q ${width * 0.5} ${height * 0.1} ${width + 50} ${height * 0.35}`}
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="2"
          fill="none"
        />
        <Path
          d={`M -50 ${height * 0.45} Q ${width * 0.6} ${height * 0.7} ${width + 50} ${height * 0.5}`}
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="2"
          fill="none"
        />
      </Svg>

      {/* Main Success Content */}
      <View style={styles.content}>
        {/* Glowing Checkmark Circle */}
        <View style={styles.glowAura}>
          <View style={styles.glowCircle}>
            <Check size={48} color="#FFFFFF" strokeWidth={3.5} />
          </View>
        </View>

        <Text style={styles.successTitle}>Transfer Success</Text>
        <Text style={styles.successSubtitle}>
          You Have Successfully transferred {formatCurrency(amount)} to {payee}
        </Text>

        {/* Receipt Box */}
        <View style={styles.receiptBox}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Transaction ID</Text>
            <Text style={styles.receiptVal}>WL-{Math.floor(100000 + Math.random() * 900000)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Total Amount</Text>
            <Text style={styles.receiptValBold}>{formatCurrency(amount)}</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Status</Text>
            <Text style={styles.receiptStatus}>Completed</Text>
          </View>
        </View>

        {/* Back To Home Button */}
        <TouchableOpacity
          style={styles.backHomeBtn}
          onPress={onBackToHome}
          activeOpacity={0.88}
        >
          <Text style={styles.backHomeBtnText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4361EE',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  glowAura: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  glowCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  successSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 13,
  },
  receiptVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  receiptValBold: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  receiptStatus: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  backHomeBtn: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    backgroundColor: '#38B6FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backHomeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
