import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import {
  User,
  Shield,
  Settings as SettingsIcon,
  HelpCircle,
  Phone,
  LogOut,
  ChevronRight,
  Server,
  X,
  CreditCard,
  FileSpreadsheet,
  Landmark,
} from 'lucide-react-native';
import { setApiHost, getApiBaseUrl, DEFAULT_API_HOST, API_PORT } from '../api';

export default function ProfileScreen({
  theme,
  isDark,
  onToggleTheme,
  userName = 'Arya Wijaya',
  userPhone = '+62 8123456789',
  userEmail = 'arya.wijaya@walley.app',
  onLogout,
  onNavigate,
}) {
  const [showServerModal, setShowServerModal] = useState(false);
  const [hostInput, setHostInput] = useState(DEFAULT_API_HOST);

  const menuItems = [
    {
      id: 'account',
      title: 'My Account',
      subtitle: 'Personal details, email & phone',
      icon: User,
      onPress: () => Alert.alert('My Account', `Name: ${userName}\nEmail: ${userEmail}\nPhone: ${userPhone}`),
    },
    {
      id: 'switchAccount',
      title: 'Switch Active Account',
      subtitle: 'Change or add linked bank account',
      icon: Landmark,
      onPress: () => onNavigate('selectAccount'),
    },
    {
      id: 'cards',
      title: 'Payment Cards',
      subtitle: 'Manage credit, debit & digital cards',
      icon: CreditCard,
      onPress: () => onNavigate('selectCard'),
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      subtitle: 'Walley biometric security & encryption',
      icon: Shield,
      onPress: () => Alert.alert('Privacy Policy', 'Walley employs AES-256 bank-level encryption. Your biometric credentials and financial records remain confidential and secure.'),
    },
    {
      id: 'settings',
      title: 'Setting',
      subtitle: 'Display preferences & security controls',
      icon: SettingsIcon,
      onPress: () => Alert.alert('Settings', `Current Theme: ${isDark ? 'Dark Mode' : 'Light Mode'}\nSecurity: Biometric Shield Active`),
    },
    {
      id: 'server',
      title: 'Server & API Host',
      subtitle: `Connected to ${getApiBaseUrl()}`,
      icon: Server,
      onPress: () => setShowServerModal(true),
    },
    {
      id: 'help',
      title: 'Help Center',
      subtitle: 'FAQ, guides & transaction disputes',
      icon: HelpCircle,
      onPress: () => Alert.alert('Help Center', 'Need assistance? Email support@walley.app or call our 24/7 helpline at +62 800-WALLEY.'),
    },
    {
      id: 'contact',
      title: 'Contact',
      subtitle: 'Direct chat & representative support',
      icon: Phone,
      onPress: () => Alert.alert('Contact Support', 'Representative is online. Toll-free: 1800-419-WALLEY.'),
    },
  ];

  const handleSaveHost = () => {
    if (!hostInput.trim()) return;
    setApiHost(hostInput.trim());
    setShowServerModal(false);
    Alert.alert('Server Host Updated', `API endpoint set to: ${getApiBaseUrl()}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card Profile Header (Matching Image 1 Profile screen) */}
        <View
          style={[
            styles.profileHero,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          {/* Avatar with circular aura */}
          <View style={[styles.avatarAura, { borderColor: theme.primaryLight }]}>
            <View style={[styles.avatarCircle, { backgroundColor: theme.primarySoft }]}>
              <User size={38} color={theme.primary} strokeWidth={2.4} />
            </View>
          </View>

          <Text style={[styles.nameText, { color: theme.textPrimary }]}>{userName}</Text>
          <Text style={[styles.phoneText, { color: theme.textMuted }]}>{userPhone}</Text>
        </View>

        {/* Theme Switch Row */}
        <View
          style={[
            styles.themeSwitchCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          <View>
            <Text style={[styles.menuTitle, { color: theme.textPrimary }]}>Dark Mode</Text>
            <Text style={[styles.menuSub, { color: theme.textMuted }]}>
              {isDark ? 'Dark theme active' : 'Light theme active'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={onToggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Menu Items List */}
        <View style={styles.menuList}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  theme.cardShadowSoft,
                ]}
                onPress={item.onPress}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: theme.primarySoft }]}>
                  <Icon size={20} color={theme.primary} strokeWidth={2.2} />
                </View>
                <View style={styles.menuText}>
                  <Text style={[styles.menuTitle, { color: theme.textPrimary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.menuSub, { color: theme.textMuted }]} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>
                <ChevronRight size={18} color={theme.textDim} />
              </TouchableOpacity>
            );
          })}

          {/* Logout Action */}
          <TouchableOpacity
            style={[
              styles.logoutBtn,
              { backgroundColor: theme.surface, borderColor: 'rgba(244, 63, 94, 0.25)' },
              theme.cardShadowSoft,
            ]}
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to log out of Walley?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: onLogout },
              ]);
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}>
              <LogOut size={20} color={theme.accentRose} strokeWidth={2.2} />
            </View>
            <View style={styles.menuText}>
              <Text style={[styles.menuTitle, { color: theme.accentRose }]}>Logout</Text>
              <Text style={[styles.menuSub, { color: theme.textMuted }]}>
                End current active session
              </Text>
            </View>
            <ChevronRight size={18} color={theme.accentRose} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* API Host Configuration Modal */}
      <Modal visible={showServerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>API Server Host</Text>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
              Configure the backend server IP (10.0.2.2 for Android emulator, LAN IP for phone)
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary },
              ]}
              value={hostInput}
              onChangeText={setHostInput}
              placeholder="e.g. 192.168.1.5 or localhost"
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSaveHost}
            >
              <Text style={styles.modalSaveText}>Save Host Config</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileHero: {
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 16,
  },
  avatarAura: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 13,
  },
  themeSwitchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  menuList: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    marginTop: 6,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalBox: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  modalInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    marginBottom: 18,
  },
  modalSaveBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
