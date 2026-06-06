import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { updateUser } from '../services/firestoreService';
import { generateExposurePlan } from '../services/aiChallengeService';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SPACE, FONTS } from '../constants/theme';
import AuroraBackground from '../components/AuroraBackground';
import PrimaryButton from '../components/PrimaryButton';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'TimeframeSetup'> };

const TIMEFRAMES = [
  { label: '2 weeks' },
  { label: '1 month' },
  { label: '3 months' },
  { label: '6 months' },
  { label: 'As long as it takes' },
];

export default function TimeframeSetupScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { firebaseUser, user, refreshUser } = useAuth();
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingMsg, setGeneratingMsg] = useState('');

  const handleFinish = async () => {
    if (!firebaseUser || !user || !selected) return;
    setLoading(true);
    setGeneratingMsg('Saving your timeframe...');
    try {
      await updateUser(firebaseUser.uid, {
        timeframe: selected,
        onboardingCompleted: true,
      });
      const updatedUser = { ...user, timeframe: selected, onboardingCompleted: true };
      setGeneratingMsg('Generating your personalized plan with AI...');
      await generateExposurePlan(updatedUser, (msg) => setGeneratingMsg(msg));
      await refreshUser();
      navigation.navigate('Home');
    } catch (err) {
      console.error('Plan generation failed:', err);
      await refreshUser();
      navigation.navigate('Home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { overflow: 'hidden' }]}>
      <AuroraBackground />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + SPACE.xxl, paddingBottom: insets.bottom + SPACE.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>How long do you want{'\n'}to work on this?</Text>
        <Text style={styles.subtitle}>Set a realistic timeframe for your journey.</Text>

        <View style={styles.list}>
          {TIMEFRAMES.map((t) => (
            <TouchableOpacity
              key={t.label}
              onPress={() => setSelected(t.label)}
              style={[styles.chip, selected === t.label && styles.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, selected === t.label && styles.chipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton
          title="Build My Plan ✨"
          onPress={handleFinish}
          loading={loading}
          disabled={!selected}
          style={styles.btn}
        />
      </ScrollView>

      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.loadingCard}>
            <View style={[styles.orb, { width: width * 0.3, height: width * 0.3, borderRadius: width * 0.15 }]} />
            <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: SPACE.lg }} />
            <Text style={styles.loadingText}>{generatingMsg}</Text>
            <Text style={styles.loadingSubtext}>This may take a moment...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: SPACE.xl, gap: SPACE.md },
  title: { fontSize: 32, ...FONTS.heading, color: COLORS.text },
  subtitle: { fontSize: 15, color: COLORS.textSub, lineHeight: 22 },
  list: { gap: SPACE.sm, marginTop: SPACE.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: SPACE.md,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  chipText: { fontSize: 16, color: COLORS.textSub, ...FONTS.subheading },
  chipTextActive: { color: '#fff' },
  btn: { marginTop: SPACE.lg, alignSelf: 'stretch' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACE.xxl,
    alignItems: 'center',
    gap: SPACE.md,
    width: '80%',
  },
  orb: {
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  loadingText: {
    fontSize: 16,
    ...FONTS.subheading,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACE.sm,
  },
  loadingSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
