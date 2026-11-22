import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Eye, EyeOff, ShieldCheck, Check, Server, X, Globe, Sparkles } from 'lucide-react-native';
import WalleyLogo from '../components/WalleyLogo';
import GoogleIcon from '../components/GoogleIcon';
import {
  api,
  saveToken,
  getApiHost,
  setApiHost,
  getApiBaseUrl,
  API_PORT,
  DEFAULT_API_HOST,
} from '../api';

export default function AuthScreen({ theme, onAuthSuccess }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  // Server IP Config Modal State
  const [showServerModal, setShowServerModal] = useState(false);
  const [serverHostInput, setServerHostInput] = useState(getApiHost());

  const isLogin = authMode === 'login';

  const validateEmail = (val) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(val).toLowerCase());
  };

  const handleAuth = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return Alert.alert('Required Field', 'Please enter your email address.');
    }
    if (!validateEmail(trimmedEmail)) {
      return Alert.alert('Invalid Email', 'Please enter a valid email format (e.g., user@example.com).');
    }
    if (!password) {
      return Alert.alert('Required Field', 'Please enter your password.');
    }

    // Backend requires at least 8 characters for security
    if (password.length < 8) {
      return Alert.alert(
        'Password Too Short',
        'Your password must be at least 8 characters long for secure encryption.'
      );
    }

    if (!isLogin) {
      if (!fullName.trim()) {
        return Alert.alert('Required Field', 'Please enter your full name.');
      }
      if (password !== confirmPassword) {
        return Alert.alert('Password Mismatch', 'Passwords do not match. Please re-enter carefully.');
      }
    }

    setLoading(true);

    try {
      if (!isLogin) {
        // --- REGISTRATION FLOW ---
        try {
          await api.register(trimmedEmail, password);
        } catch (regErr) {
          const errMsg = regErr.message || '';
          if (
            errMsg.includes('Network error') ||
            errMsg.includes('timeout') ||
            errMsg.includes('Failed to fetch') ||
            errMsg.includes('Network request failed')
          ) {
            promptOfflineDemo('Registration server unreachable');
            return;
          }

          // If email already registered, ask user if they want to sign in
          if (errMsg.includes('already registered') || errMsg.includes('409')) {
            Alert.alert(
              'Account Already Exists',
              'This email is already registered with Walley. Please sign in instead.',
              [
                { text: 'Switch to Sign In', onPress: () => setAuthMode('login') },
                { text: 'OK' },
              ]
            );
            return;
          }

          // Genuine backend validation or server error
          return Alert.alert('Sign Up Failed', errMsg);
        }
      }

      // --- LOGIN / JWT RETRIEVAL ---
      let data;
      try {
        data = await api.login(trimmedEmail, password);
      } catch (loginErr) {
        const errMsg = loginErr.message || '';
        if (
          errMsg.includes('Network error') ||
          errMsg.includes('timeout') ||
          errMsg.includes('Failed to fetch') ||
          errMsg.includes('Network request failed')
        ) {
          promptOfflineDemo('Authentication server unreachable');
          return;
        }

        return Alert.alert('Authentication Failed', errMsg || 'Invalid email or password.');
      }

      const jwt = data?.token || data?.accessToken || 'demo_walley_token';
      await saveToken(jwt);
      onAuthSuccess(jwt, {
        email: trimmedEmail,
        name: fullName.trim() || data?.user?.name || 'Arya Wijaya',
      });
    } catch (err) {
      Alert.alert('Error', err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const promptOfflineDemo = (reason) => {
    Alert.alert(
      'Server Connection Issue',
      `${reason} at:\n${getApiBaseUrl()}\n\nWould you like to enter in Offline Demo Mode or configure the server IP?`,
      [
        {
          text: 'Configure IP',
          onPress: () => setShowServerModal(true),
        },
        {
          text: 'Enter Demo Mode',
          style: 'default',
          onPress: () => enterDemoMode(),
        },
      ]
    );
  };

  const enterDemoMode = async () => {
    setLoading(true);
    const demoToken = 'demo_walley_token_' + Date.now();
    await saveToken(demoToken);
    setTimeout(() => {
      setLoading(false);
      onAuthSuccess(demoToken, {
        name: fullName.trim() || 'Arya Wijaya',
        email: email.trim() || 'arya.wijaya@walley.app',
      });
    }, 400);
  };

  const fillDemoAccount = () => {
    if (isLogin) {
      setEmail('arya.wijaya@walley.app');
      setPassword('Walley@2026!');
    } else {
      setFullName('Arya Wijaya');
      setEmail('arya.wijaya@walley.app');
      setPassword('Walley@2026!');
      setConfirmPassword('Walley@2026!');
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setTimeout(async () => {
      setLoading(false);
      const demoToken = 'google_oauth_token_' + Date.now();
      await saveToken(demoToken);
      onAuthSuccess(demoToken, {
        name: 'Arya Wijaya',
        email: 'arya.wijaya@gmail.com',
      });
    }, 600);
  };

  const handleSaveServerHost = () => {
    if (!serverHostInput.trim()) return;
    setApiHost(serverHostInput.trim());
    setShowServerModal(false);
    Alert.alert('Server IP Updated', `API endpoint set to:\n${getApiBaseUrl()}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Top Bar */}
        <View style={styles.topBrandRow}>
          <View style={styles.logoGroup}>
            <WalleyLogo size={36} />
            <Text style={[styles.brandName, { color: theme.textPrimary }]}>Walley</Text>
          </View>
          <View style={[styles.secureBadge, { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder }]}>
            <ShieldCheck size={14} color={theme.primary} />
            <Text style={[styles.secureBadgeText, { color: theme.primary }]}>Secure wallet</Text>
          </View>
        </View>

        {/* Server Host Status Pill */}
        <TouchableOpacity
          style={[styles.serverPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
          onPress={() => setShowServerModal(true)}
          activeOpacity={0.8}
        >
          <Server size={13} color={theme.primary} />
          <Text style={[styles.serverPillText, { color: theme.textSecondary }]} numberOfLines={1}>
            API Host: {getApiHost()}:{API_PORT}
          </Text>
          <Text style={[styles.serverPillAction, { color: theme.primary }]}>Edit</Text>
        </TouchableOpacity>

        {/* Header Title & Subtitle */}
        <View style={styles.headerBlock}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {isLogin
              ? 'Sign in and pick up where you left off.'
              : 'A little sign up. A smarter financial future.'}
          </Text>
        </View>

        {/* Input Form */}
        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Full name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.textPrimary,
                  },
                ]}
                placeholder="Your full name"
                placeholderTextColor={theme.textDim}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Email address</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="you@example.com"
              placeholderTextColor={theme.textDim}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Password</Text>
              {!isLogin && (
                <Text style={[styles.charNote, { color: theme.textDim }]}>Min 8 characters</Text>
              )}
            </View>
            <View
              style={[
                styles.passwordWrapper,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: theme.textPrimary }]}
                placeholder={isLogin ? 'Enter your password' : 'Create a password (min 8 chars)'}
                placeholderTextColor={theme.textDim}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={theme.textMuted} />
                ) : (
                  <Eye size={18} color={theme.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Confirm password</Text>
              <View
                style={[
                  styles.passwordWrapper,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordInput, { color: theme.textPrimary }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={theme.textDim}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} color={theme.textMuted} />
                  ) : (
                    <Eye size={18} color={theme.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Remember Me & Forgot Password Row (Login Mode) */}
          {isLogin && (
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: rememberMe ? theme.primary : theme.inputBorder,
                      backgroundColor: rememberMe ? theme.primary : 'transparent',
                    },
                  ]}
                >
                  {rememberMe && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={[styles.rememberText, { color: theme.textMuted }]}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Alert.alert('Reset Password', 'A reset link has been dispatched to your email address.')}
              >
                <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.primary },
              loading && { opacity: 0.8 },
            ]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {isLogin ? 'Sign in' : 'Create account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Terms Agreement (Register Mode) */}
          {!isLogin && (
            <Text style={[styles.termsText, { color: theme.textMuted }]}>
              By signing up, you agree to our{' '}
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Terms of Service</Text>{' '}
              and{' '}
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Privacy Policy</Text>.
            </Text>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>
              {isLogin ? 'or continue with' : 'or sign up with'}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />
          </View>

          {/* Google Social Button */}
          <TouchableOpacity
            style={[
              styles.googleBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={handleGoogleAuth}
            activeOpacity={0.85}
          >
            <GoogleIcon size={20} />
            <Text style={[styles.googleBtnText, { color: theme.textPrimary }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Security Assurance Tagline (Login Mode) */}
          {isLogin && (
            <View style={styles.securityRow}>
              <ShieldCheck size={15} color={theme.primary} />
              <Text style={[styles.securityText, { color: theme.textMuted }]}>
                Your money. Safe, secure, and yours.
              </Text>
            </View>
          )}

          {/* Mode Switch Bottom Bar */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchQuestion, { color: theme.textMuted }]}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
            </Text>
            <TouchableOpacity onPress={() => setAuthMode(isLogin ? 'register' : 'login')}>
              <Text style={[styles.switchAction, { color: theme.primary }]}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Demo Helpers */}
          <View style={styles.demoBox}>
            <TouchableOpacity style={styles.demoFillBtn} onPress={fillDemoAccount}>
              <Text style={[styles.demoFillText, { color: theme.primary }]}>
                {isLogin ? 'Fill Demo Credentials' : 'Fill Demo Sign Up Form'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipBtn} onPress={enterDemoMode}>
              <Sparkles size={14} color={theme.accentCyan} />
              <Text style={[styles.skipText, { color: theme.textSecondary }]}>
                Skip & Explore in Offline Mode
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Server IP Configuration Modal */}
      <Modal visible={showServerModal} transparent animationType="slide" onRequestClose={() => setShowServerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Server size={20} color={theme.primary} />
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>API Server Host</Text>
              </View>
              <TouchableOpacity onPress={() => setShowServerModal(false)}>
                <X size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: theme.textMuted }]}>
              Set the backend API host IP address for your environment:
            </Text>

            {/* Quick Preset Buttons */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setServerHostInput('localhost')}
              >
                <Text style={[styles.presetBtnText, { color: theme.textPrimary }]}>localhost (Web/iOS)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setServerHostInput('10.0.2.2')}
              >
                <Text style={[styles.presetBtnText, { color: theme.textPrimary }]}>10.0.2.2 (Emulator)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setServerHostInput('172.20.249.4')}
              >
                <Text style={[styles.presetBtnText, { color: theme.textPrimary }]}>172.20.249.4 (Wi-Fi)</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.textPrimary },
              ]}
              value={serverHostInput}
              onChangeText={setServerHostInput}
              placeholder="e.g. 172.20.249.4 or 10.0.2.2"
              placeholderTextColor={theme.textDim}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSaveServerHost}
            >
              <Text style={styles.modalSaveText}>Save Host Config</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 36 : 16,
    paddingBottom: 40,
  },
  topBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  secureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  serverPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serverPillAction: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  headerBlock: {
    marginBottom: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  charNote: {
    fontSize: 12,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  passwordWrapper: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberText: {
    fontSize: 13,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
  },
  googleBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  googleBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  securityText: {
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  switchQuestion: {
    fontSize: 14,
  },
  switchAction: {
    fontSize: 14,
    fontWeight: '700',
  },
  demoBox: {
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  demoFillBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  demoFillText: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 214, 160, 0.1)',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 14,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '600',
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
