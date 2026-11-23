import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PlusCircle, FileSpreadsheet, PieChart, Target } from 'lucide-react-native';

export default function FeaturedActions({
  theme,
  onPressAddTx,
  onPressUploadCsv,
  onPressSetBudget,
  onPressSetGoal,
}) {
  const actions = [
    {
      id: 'addTx',
      title: 'Add Transaction',
      icon: PlusCircle,
      color: theme.accentEmerald || '#10B981',
      onPress: onPressAddTx,
    },
    {
      id: 'uploadCsv',
      title: 'Upload CSV Statement',
      icon: FileSpreadsheet,
      color: theme.primary || '#4361EE',
      onPress: onPressUploadCsv,
    },
    {
      id: 'budget',
      title: 'Set Monthly Budget',
      icon: PieChart,
      color: theme.accentPurple || '#7209B7',
      onPress: onPressSetBudget,
    },
    {
      id: 'goal',
      title: 'New Savings Goal',
      icon: Target,
      color: theme.accentRose || '#F72585',
      onPress: onPressSetGoal,
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
                <Icon size={24} color={act.color} strokeWidth={2.2} />
              </View>
              <Text style={[styles.actionLabel, { color: theme.textSecondary }]} numberOfLines={2}>
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
    paddingHorizontal: 16,
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
    alignItems: 'flex-start',
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
    gap: 8,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
});
