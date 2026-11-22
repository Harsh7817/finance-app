import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, Sun, Moon, RefreshCw, UserRound } from 'lucide-react-native';

export default function WalleyHeader({
  theme,
  isDark,
  onToggleTheme,
  onPressNotifications,
  onSwitchAccount,
  selectedAccount = null,
}) {
  return (
    <View style={styles.container}>
      {/* Left: Walley wordmark */}
      <Text style={[styles.brandText, { color: theme.textPrimary }]}>Walley</Text>

      <View style={styles.actionsGroup}>
        {/* Dark/Light Mode Switcher */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          onPress={onToggleTheme}
          activeOpacity={0.7}
        >
          {isDark ? (
            <Sun size={18} color="#FBBF24" />
          ) : (
            <Moon size={18} color={theme.textPrimary} />
          )}
        </TouchableOpacity>

        {/* Notifications Bell */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          onPress={onPressNotifications}
          activeOpacity={0.7}
        >
          <Bell size={18} color={theme.textPrimary} />
          <View style={[styles.badgeDot, { backgroundColor: theme.primary }]} />
        </TouchableOpacity>

        {/* Switch Account — person inside circular arrows */}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          onPress={onSwitchAccount}
          activeOpacity={0.7}
        >
          {/* Circular arrows ring */}
          <View style={styles.switchIconWrap}>
            <RefreshCw size={34} color={theme.textPrimary} strokeWidth={1.6} style={styles.switchRing} />
            {/* Person icon centered inside the ring */}
            <View style={styles.switchPersonCenter}>
              <UserRound size={14} color={theme.textPrimary} strokeWidth={2} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  switchIconWrap: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  switchRing: {
    position: 'absolute',
  },
  switchPersonCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
