import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  PlusCircle,
  FileSpreadsheet,
  PieChart,
  Target,
  X,
} from 'lucide-react-native';

export default function QuickActionModal({
  visible,
  onClose,
  theme,
  onSelectAction,
}) {
  const options = [
    {
      id: 'transfer',
      title: 'Transfer Money',
      subtitle: 'Send instantly to contacts or bank accounts',
      icon: ArrowUpRight,
      color: theme.primary,
    },
    {
      id: 'request',
      title: 'Request Money (QR)',
      subtitle: 'Receive funds with your custom QR code',
      icon: ArrowDownLeft,
      color: theme.accentCyan,
    },
    {
      id: 'bill',
      title: 'Pay a Bill',
      subtitle: 'Electricity, water, internet, and utilities',
      icon: Receipt,
      color: theme.accentAmber,
    },
    {
      id: 'addTx',
      title: 'Add Transaction',
      subtitle: 'Record a manual expense or income',
      icon: PlusCircle,
      color: theme.accentEmerald,
    },
    {
      id: 'csvImport',
      title: 'Upload CSV Statement',
      subtitle: 'Import bank statements automatically',
      icon: FileSpreadsheet,
      color: theme.primaryLight,
    },
    {
      id: 'budget',
      title: 'Set Monthly Budget',
      subtitle: 'Track spending caps and categories',
      icon: PieChart,
      color: theme.accentPurple,
    },
    {
      id: 'goal',
      title: 'New Savings Goal',
      subtitle: 'Set targets for vacation, emergency, car',
      icon: Target,
      color: theme.accentRose,
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Drag Handle */}
              <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

              {/* Modal Header */}
              <View style={styles.header}>
                <View>
                  <Text style={[styles.title, { color: theme.textPrimary }]}>Quick Actions</Text>
                  <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                    Choose an operation to proceed
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: theme.surfaceAlt }]}
                  onPress={onClose}
                >
                  <X size={18} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Action List */}
              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {options.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.item,
                        {
                          backgroundColor: theme.surfaceAlt,
                          borderColor: theme.borderLight,
                        },
                      ]}
                      onPress={() => {
                        onClose();
                        onSelectAction(opt.id);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.iconBox, { backgroundColor: theme.surface }]}>
                        <Icon size={22} color={opt.color} strokeWidth={2.4} />
                      </View>
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>
                          {opt.title}
                        </Text>
                        <Text style={[styles.itemSubtitle, { color: theme.textMuted }]}>
                          {opt.subtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '82%',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
  },
});
