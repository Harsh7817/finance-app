import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  ChevronLeft,
  Zap,
  Droplet,
  Wifi,
  Tv,
  Smartphone,
  MoreHorizontal,
  ArrowUpRight,
} from 'lucide-react-native';
import { formatCurrency } from '../theme';

export default function BillPayScreen({
  theme,
  onBack,
  onSelectCategory,
}) {
  const categories = [
    { id: 'electricity', label: 'Electricity', icon: Zap, color: theme.primary, provider: 'PLN Electricity' },
    { id: 'water', label: 'Water', icon: Droplet, color: theme.accentCyan, provider: 'City Water Works' },
    { id: 'internet', label: 'Internet', icon: Wifi, color: theme.accentPurple, provider: 'Fiber Broadband' },
    { id: 'television', label: 'Television', icon: Tv, color: theme.accentAmber, provider: 'Cable Network' },
  ];

  const recentBills = [
    { id: 'b1', name: 'Electricity', date: 'Aug 2, 2026', amount: 20.0, icon: Zap, color: theme.primary },
    { id: 'b2', name: 'Water', date: 'Aug 1, 2026', amount: 12.0, icon: Droplet, color: theme.accentCyan },
    { id: 'b3', name: 'Television', date: 'Aug 1, 2026', amount: 29.0, icon: Tv, color: theme.accentAmber },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Bill Pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Bill Reminder Card (Matching Image 1 Bill Pay) */}
        <View
          style={[
            styles.dueCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          <View style={styles.dueCardTop}>
            <View>
              <Text style={[styles.dueLabel, { color: theme.textMuted }]}>Total Bill Due</Text>
              <Text style={[styles.dueAmount, { color: theme.textPrimary }]}>$20.00</Text>
            </View>
            <View style={styles.dueIconsGroup}>
              <View style={[styles.miniCircle, { backgroundColor: theme.primarySoft }]}>
                <Zap size={16} color={theme.primary} />
              </View>
              <View style={[styles.miniCircle, { backgroundColor: 'rgba(6, 214, 160, 0.14)', marginLeft: -8 }]}>
                <Droplet size={16} color={theme.accentCyan} />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.payNowBtn, { backgroundColor: theme.primary }]}
            onPress={() => onSelectCategory(categories[0])}
            activeOpacity={0.88}
          >
            <Text style={styles.payNowText}>Pay Now</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Grid (4 items matching Image 1: Electricity, Water, Internet, More) */}
        <View style={styles.gridSection}>
          <View style={styles.grid}>
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.gridItem}
                  onPress={() => onSelectCategory(c)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.gridIconCircle,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                      theme.cardShadowSoft,
                    ]}
                  >
                    <Icon size={24} color={c.color} strokeWidth={2.4} />
                  </View>
                  <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Last Activity (Image 1 Bill Pay) */}
        <View style={styles.activitySection}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Last activity</Text>

          <View style={styles.billsList}>
            {recentBills.map((b) => {
              const Icon = b.icon;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.billRow,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    theme.cardShadowSoft,
                  ]}
                  onPress={() => onSelectCategory({ label: b.name, provider: b.name + ' Service', color: b.color })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.billIconBox, { backgroundColor: 'rgba(67, 97, 238, 0.1)' }]}>
                    <Icon size={20} color={b.color} strokeWidth={2.4} />
                  </View>
                  <View style={styles.billDetails}>
                    <Text style={[styles.billTitle, { color: theme.textPrimary }]}>{b.name}</Text>
                    <Text style={[styles.billDate, { color: theme.textMuted }]}>{b.date}</Text>
                  </View>
                  <Text style={[styles.billAmount, { color: theme.textPrimary }]}>
                    -{formatCurrency(b.amount)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  dueCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 20,
  },
  dueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  dueLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dueAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  dueIconsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  payNowBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  gridSection: {
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridItem: {
    alignItems: 'center',
    gap: 8,
  },
  gridIconCircle: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  activitySection: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  billsList: {
    gap: 10,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  billIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  billDetails: {
    flex: 1,
  },
  billTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 12,
  },
  billAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
});
