import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, Plus, Receipt } from 'lucide-react-native';

export default function FeaturedActions({
  theme,
  onPressTransfer,
  onPressRequest,
  onPressTopUp,
  onPressBill,
}) {
  const actions = [
    {
      id: 'transfer',
      title: 'Transfer',
      icon: ArrowUpRight,
      color: theme.primary,
      onPress: onPressTransfer,
    },
    {
      id: 'request',
      title: 'Request',
      icon: ArrowDownLeft,
      color: theme.accentCyan,
      onPress: onPressRequest,
    },
    {
      id: 'topup',
      title: 'Top up',
      icon: Plus,
      color: theme.accentPurple,
      onPress: onPressTopUp,
    },
    {
      id: 'bill',
      title: 'Bill',
      icon: Receipt,
      color: theme.accentAmber,
      onPress: onPressBill,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Featured</Text>
      <View style={styles.grid}>
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <TouchableOpacity
              key={act.id}
              style={styles.actionBtn}
              onPress={act.onPress}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                  theme.cardShadowSoft,
                ]}
              >
                <Icon size={22} color={act.color} strokeWidth={2.4} />
              </View>
              <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>
                {act.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
