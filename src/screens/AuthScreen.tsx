import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
} from 'firebase/auth';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../config/firebase';
import { createDefaultUser } from '../services/firestoreService';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SPACE, FONTS } from '../constants/theme';
import AuroraBackground from '../components/AuroraBackground';
import PrimaryButton from '../components/PrimaryButton';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Auth'> };

type Mode = 'signin' | 'signup';

export default function AuthScreen({ navigation: _navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'signup' && !displayName.trim()) e.displayName = 'Name is required';
    if (!email.trim()) e.email = 'Email is required';
    if (!password) e.password = 'Password is required';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (mode === 'signup' && password !== confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    return e;
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    try {
      await signInAnonymously(auth);
      // AuthContext picks up onAuthStateChanged and creates guest user doc automatically
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not sign in as guest';
      setErrors({ general: msg });
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await createDefaultUser(cred.user.uid, email.trim(), displayName.trim());
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { overflow: 'hidden' }]}>
      <AuroraBackground />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + SPACE.xxl, paddingBottom: insets.bottom + SPACE.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signin'
              ? 'Sign in to continue your journey'
              : 'Start your social confidence journey'}
          </Text>

          {/* Mode Toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              onPress={() => setMode('signin')}
              style={[styles.toggleBtn, mode === 'signin' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, mode === 'signin' && styles.toggleTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode('signup')}
              style={[styles.toggleBtn, mode === 'signup' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {errors.general ? (
            <Text style={styles.errorGeneral}>{errors.general}</Text>
          ) : null}

          {mode === 'signup' && (
            <View style={styles.fieldWrap}>
              <TextInput
                style={[styles.input, errors.displayName ? styles.inputError : null]}
                placeholder="Display Name"
                placeholderTextColor={COLORS.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                editable={!loading}
                autoCapitalize="words"
              />
              {errors.displayName ? <Text style={styles.errorText}>{errors.displayName}</Text> : null}
            </View>
          )}

          <View style={styles.fieldWrap}>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.fieldWrap}>
            <TextInput
              style={[styles.input, errors.password ? styles.inputError : null]}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              secureTextEntry
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {mode === 'signup' && (
            <View style={styles.fieldWrap}>
              <TextInput
                style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                editable={!loading}
                secureTextEntry
              />
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>
          )}

          <PrimaryButton
            title={mode === 'signin' ? 'Sign In' : 'Create Account'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={handleGuest}
            disabled={guestLoading || loading}
            style={styles.guestBtn}
            activeOpacity={0.75}
          >
            {guestLoading ? (
              <ActivityIndicator color={COLORS.textSub} size="small" />
            ) : (
              <Text style={styles.guestBtnText}>Continue as Guest</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.guestNote}>
            No account needed · Jump straight into the app
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACE.xl,
    gap: SPACE.md,
  },
  title: {
    fontSize: 32,
    ...FONTS.heading,
    color: COLORS.text,
    marginBottom: SPACE.xs,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSub,
    marginBottom: SPACE.lg,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: SPACE.lg,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: RADIUS.full,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 15,
    ...FONTS.subheading,
    color: COLORS.textSub,
  },
  toggleTextActive: {
    color: '#fff',
  },
  fieldWrap: {
    gap: SPACE.xs,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACE.md,
    color: COLORS.text,
    fontSize: 15,
    minHeight: 50,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
  },
  errorGeneral: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(255,110,110,0.1)',
    borderRadius: RADIUS.md,
    padding: SPACE.md,
  },
  submitBtn: {
    marginTop: SPACE.md,
    alignSelf: 'stretch',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  guestBtn: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    minHeight: 50,
    justifyContent: 'center',
  },
  guestBtnText: {
    fontSize: 15,
    ...FONTS.subheading,
    color: COLORS.textSub,
  },
  guestNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
