import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import {
  ChevronLeft,
  FileSpreadsheet,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Landmark,
  Sparkles,
  Clock,
} from 'lucide-react-native';
import WalleyLogo from '../components/WalleyLogo';

export default function ImportMethodScreen({
  theme,
  selectedAccount = null,
  userName = 'Arya Wijaya',
  onBack,
  onUploadCsv,
  onSkip,
}) {
  const handleSmsParsingPress = () => {
    Alert.alert(
      'SMS Parsing (Upcoming)',
      'SMS parsing is currently under active development and will be released in an upcoming update to automatically extract transactions from your bank SMS alerts.\n\nPlease upload a CSV statement or tap Skip to continue to your dashboard.',
      [{ text: 'Got it' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ChevronLeft size={26} color={theme.textPrimary} strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={styles.brandRow}>
          <WalleyLogo size={28} />
          <Text style={[styles.brandText, { color: theme.textPrimary }]}>Walley</Text>
        </View>
        <View style={[styles.secureBadge, { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }]}>
          <ShieldCheck size={13} color={theme.primary} />
          <Text style={[styles.secureText, { color: theme.primary }]}>Secure</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Title Block ── */}
        <View style={styles.headerBlock}>
          <Text style={[styles.badgeLabel, { color: theme.primary }]}>ACCOUNT LINKED</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Import Transactions
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Choose how you would like to sync transactions for your account to power your expenditure advisor.
          </Text>

          {/* Active Account Pill */}
          {selectedAccount && (
            <View
              style={[
                styles.accountPill,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
                theme.cardShadowSoft,
              ]}
            >
              <View style={[styles.accountIconBox, { backgroundColor: theme.primarySoft }]}>
                <Landmark size={18} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accountPillName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {selectedAccount.accountName}
                </Text>
                <Text style={[styles.accountPillSub, { color: theme.textMuted }]}>
                  {selectedAccount.institutionName} • {selectedAccount.accountType || 'SAVINGS'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Options Cards ── */}
        <View style={styles.optionsSection}>
          {/* Option 1: Upload CSV */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.primary,
                borderWidth: 1.5,
              },
              theme.cardShadow,
            ]}
            onPress={onUploadCsv}
            activeOpacity={0.88}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.primarySoft }]}>
              <FileSpreadsheet size={28} color={theme.primary} strokeWidth={2.2} />
            </View>

            <View style={styles.optionDetails}>
              <View style={styles.optionHeaderRow}>
                <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                  Upload CSV
                </Text>
                <View style={[styles.recommendedBadge, { backgroundColor: theme.primarySoft }]}>
                  <Sparkles size={11} color={theme.primary} />
                  <Text style={[styles.recommendedText, { color: theme.primary }]}>Recommended</Text>
                </View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textMuted }]}>
                Import your bank statement in CSV or spreadsheet format to instantly populate transactions, categories, and analytics.
              </Text>
            </View>

            <View style={[styles.actionChevronBox, { backgroundColor: theme.primary }]}>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          {/* Option 2: SMS Parsing (Upcoming) */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              styles.optionCardMuted,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
              },
              theme.cardShadowSoft,
            ]}
            onPress={handleSmsParsingPress}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <MessageSquare size={28} color="#F59E0B" strokeWidth={2.2} />
            </View>

            <View style={styles.optionDetails}>
              <View style={styles.optionHeaderRow}>
                <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>
                  SMS Parsing
                </Text>
                <View style={styles.upcomingBadge}>
                  <Clock size={11} color="#F59E0B" />
                  <Text style={styles.upcomingBadgeText}>Upcoming</Text>
                </View>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textMuted }]}>
                Automatically read and categorize real-time transactions from your incoming bank SMS alerts. Coming in the next release!
              </Text>
            </View>

            <View style={[styles.actionChevronBox, { backgroundColor: theme.surfaceAlt }]}>
              <Clock size={18} color={theme.textMuted} strokeWidth={2.2} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Skip Button ── */}
        <View style={styles.skipSection}>
          <TouchableOpacity
            style={[
              styles.skipBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
              theme.cardShadowSoft,
            ]}
            onPress={onSkip}
            activeOpacity={0.8}
          >
            <Text style={[styles.skipBtnText, { color: theme.textPrimary }]}>
              Skip to Dashboard
            </Text>
            <ArrowRight size={18} color={theme.primary} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={[styles.skipHint, { color: theme.textMuted }]}>
            You can always upload statements or sync transactions anytime later from your home dashboard.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? 38 : 14,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  secureText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerBlock: {
    marginTop: 12,
    marginBottom: 24,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  accountIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountPillName: {
    fontSize: 14,
    fontWeight: '800',
  },
  accountPillSub: {
    fontSize: 12,
    marginTop: 1,
  },
  optionsSection: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 22,
    padding: 20,
    gap: 14,
  },
  optionCardMuted: {
    opacity: 0.95,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionDetails: {
    gap: 6,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  upcomingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionChevronBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignSelf: 'flex-end',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  skipSection: {
    marginTop: 28,
    alignItems: 'center',
    gap: 10,
  },
  skipBtn: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  skipHint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
});
