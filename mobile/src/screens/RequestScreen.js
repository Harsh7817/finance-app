import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { ChevronLeft, User, Share2, Copy } from 'lucide-react-native';

export default function RequestScreen({
  theme,
  userName = 'Arya Wijaya',
  onBack,
  recentContacts = [
    { id: 'c1', name: 'Arya', phone: '+62 812-3456-7890' },
    { id: 'c2', name: 'Rafa', phone: '+62 813-8822-1044' },
    { id: 'c3', name: 'Adiba', phone: '+62 819-4455-6677' },
    { id: 'c4', name: 'Joki', phone: '+62 856-1122-3344' },
  ],
}) {
  const [selectedContact, setSelectedContact] = useState(null);

  const handleShare = () => {
    Alert.alert('Share Link', 'Payment link copied: https://walley.app/pay/arya-wijaya');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Info (Matching Image 1 Request Screen) */}
        <View style={styles.profileRow}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.primarySoft }]}>
            <User size={24} color={theme.primary} strokeWidth={2.4} />
          </View>
          <View>
            <Text style={[styles.userName, { color: theme.textPrimary }]}>{userName}</Text>
            <Text style={[styles.scanTag, { color: theme.textMuted }]}>Walley ID: @aryawijaya</Text>
          </View>
        </View>

        {/* QR Code Container */}
        <View
          style={[
            styles.qrCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            theme.cardShadowSoft,
          ]}
        >
          {/* Detailed QR Code Vector with Corner Frames */}
          <View style={styles.qrFrame}>
            <Svg width={200} height={200} viewBox="0 0 200 200">
              {/* Corner 1 Top Left */}
              <Rect x="10" y="10" width="50" height="50" rx="8" fill="#0F172A" />
              <Rect x="20" y="20" width="30" height="30" rx="4" fill="#FFFFFF" />
              <Rect x="26" y="26" width="18" height="18" rx="2" fill="#4361EE" />

              {/* Corner 2 Top Right */}
              <Rect x="140" y="10" width="50" height="50" rx="8" fill="#0F172A" />
              <Rect x="150" y="20" width="30" height="30" rx="4" fill="#FFFFFF" />
              <Rect x="156" y="26" width="18" height="18" rx="2" fill="#4361EE" />

              {/* Corner 3 Bottom Left */}
              <Rect x="10" y="140" width="50" height="50" rx="8" fill="#0F172A" />
              <Rect x="20" y="150" width="30" height="30" rx="4" fill="#FFFFFF" />
              <Rect x="26" y="156" width="18" height="18" rx="2" fill="#4361EE" />

              {/* Data matrix dots */}
              <Rect x="70" y="20" width="12" height="12" rx="2" fill="#0F172A" />
              <Rect x="90" y="20" width="12" height="12" rx="2" fill="#0F172A" />
              <Rect x="110" y="30" width="12" height="12" rx="2" fill="#0F172A" />
              <Rect x="80" y="45" width="20" height="12" rx="2" fill="#4361EE" />
              <Rect x="110" y="55" width="12" height="12" rx="2" fill="#0F172A" />

              <Rect x="20" y="80" width="12" height="12" rx="2" fill="#0F172A" />
              <Rect x="40" y="70" width="12" height="12" rx="2" fill="#0F172A" />
              <Rect x="20" y="110" width="12" height="12" rx="2" fill="#4361EE" />

              <Rect x="75" y="80" width="50" height="50" rx="6" fill="#4361EE" />
              <Rect x="87" y="92" width="26" height="26" rx="3" fill="#FFFFFF" />
              <Rect x="95" y="100" width="10" height="10" rx="2" fill="#4361EE" />

              <Rect x="140" y="80" width="12" height="12" rx="2" fill="#0F172A" />
              <Rect x="160" y="90" width="14" height="14" rx="2" fill="#0F172A" />
              <Rect x="140" y="110" width="12" height="12" rx="2" fill="#0F172A" />

              <Rect x="70" y="145" width="14" height="14" rx="2" fill="#0F172A" />
              <Rect x="95" y="150" width="12" height="12" rx="2" fill="#0F172A" />
              <Rect x="120" y="145" width="12" height="12" rx="2" fill="#4361EE" />
              <Rect x="150" y="150" width="18" height="18" rx="2" fill="#0F172A" />
              <Rect x="175" y="160" width="12" height="12" rx="2" fill="#0F172A" />
            </Svg>
          </View>

          <Text style={[styles.qrCaption, { color: theme.textMuted }]}>
            Show this code or QR to get paid
          </Text>
        </View>

        {/* Request to Contact Section (Image 1 Request Screen) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Request to Contact</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contactsRow}>
            {recentContacts.map((c) => {
              const active = selectedContact?.id === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.contactItem}
                  onPress={() => {
                    setSelectedContact(c);
                    Alert.alert('Request Sent', `A payment invoice of ₹275.00 has been sent to ${c.name}.`);
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.contactAvatar,
                      {
                        backgroundColor: active ? theme.primary : theme.surface,
                        borderColor: active ? theme.primary : theme.border,
                      },
                      theme.cardShadowSoft,
                    ]}
                  >
                    <User size={22} color={active ? '#FFFFFF' : theme.primary} strokeWidth={2.4} />
                  </View>
                  <Text style={[styles.contactName, { color: theme.textSecondary }]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Action Buttons: Share & Copy */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[
              styles.shareBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
              theme.cardShadowSoft,
            ]}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Share2 size={18} color={theme.primary} />
            <Text style={[styles.shareBtnText, { color: theme.primary }]}>Share QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.copyBtn, { backgroundColor: theme.primary }, theme.floatingShadow]}
            onPress={handleShare}
            activeOpacity={0.88}
          >
            <Copy size={18} color="#FFFFFF" />
            <Text style={styles.copyBtnText}>Copy Link</Text>
          </TouchableOpacity>
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
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
  },
  scanTag: {
    fontSize: 12,
    marginTop: 2,
  },
  qrCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginVertical: 12,
  },
  qrFrame: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  qrCaption: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
  },
  contactsRow: {
    gap: 18,
  },
  contactItem: {
    alignItems: 'center',
    gap: 6,
  },
  contactAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 12,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  shareBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  copyBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
