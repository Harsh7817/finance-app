import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import {
  Home,
  BarChart2,
  User,
} from 'lucide-react-native';

export default function WalleyBottomNav({
  theme,
  activeTab,
  onSelectTab,
}) {
  return (
    <View style={[styles.wrapper, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
          theme.cardShadow,
        ]}
      >
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onSelectTab('home')}
          activeOpacity={0.7}
        >
          <Home
            size={22}
            color={activeTab === 'home' ? theme.primary : theme.textDim}
            strokeWidth={activeTab === 'home' ? 2.5 : 2}
          />
          {activeTab === 'home' && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>

        {/* Tab 2: Statistic */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onSelectTab('statistic')}
          activeOpacity={0.7}
        >
          <BarChart2
            size={22}
            color={activeTab === 'statistic' ? theme.primary : theme.textDim}
            strokeWidth={activeTab === 'statistic' ? 2.5 : 2}
          />
          {activeTab === 'statistic' && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>

        {/* Tab 4: Profile */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onSelectTab('profile')}
          activeOpacity={0.7}
        >
          <User
            size={22}
            color={activeTab === 'profile' ? theme.primary : theme.textDim}
            strokeWidth={activeTab === 'profile' ? 2.5 : 2}
          />
          {activeTab === 'profile' && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingTop: 4,
  },
  container: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
