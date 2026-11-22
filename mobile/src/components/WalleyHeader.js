import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Bell, Sun, Moon, Wifi } from 'lucide-react-native';

export default function WalleyHeader({
  theme,
  isDark,
  onToggleTheme,
  userName = 'Arya Wijaya',
  onPressProfile,
  onPressNotifications,
}) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.profileGroup}
        onPress={onPressProfile}
        activeOpacity={0.8}
      >
        <View style={[styles.avatarWrapper, { borderColor: theme.primaryLight }]}>
          {/* Stylized Avatar */}
          <View style={[styles.avatarCircle, { backgroundColor: theme.primarySoft }]}>
            <Text style={[styles.avatarInitials, { color: theme.primary }]}>AW</Text>
          </View>
        </View>
        <View style={styles.textGroup}>
          <Text style={[styles.greeting, { color: theme.textMuted }]}>Good Morning</Text>
          <Text style={[styles.userName, { color: theme.textPrimary }]}>{userName}</Text>
        </View>
      </TouchableOpacity>

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
  profileGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
  },
  textGroup: {
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
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
});
