import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { updateUser } from '../services/firestoreService';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SPACE, FONTS } from '../constants/theme';
import AuroraBackground from '../components/AuroraBackground';
import PrimaryButton from '../components/PrimaryButton';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'GoalSetup'> };

const GOALS = [
  { label: 'Make new friends' },
  { label: 'Be confident at work' },
  { label: 'Date more' },
  { label: 'Overcome fear of judgment' },
  { label: 'Public speaking' },
  { label: 'Be more social in general' },
];

export default function GoalSetupScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { firebaseUser, refreshUser } = useAuth();
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!firebaseUser || !selected) return;
    setLoading(true);
    try {
      await updateUser(firebaseUser.uid, { goal: selected });
      await refreshUser();
      navigation.navigate('TimeframeSetup');
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
        <Text style={styles.title}>What's your main{'\n'}social goal?</Text>
        <Text style={styles.subtitle}>
          We'll personalize your journey around what matters most to you.
        </Text>

        <View style={styles.grid}>
          {GOALS.map((g) => (
            <TouchableOpacity
              key={g.label}
              onPress={() => setSelected(g.label)}
              style={[styles.chip, selected === g.label && styles.chipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, selected === g.label && styles.chipTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <PrimaryButton
          title="Next →"
          onPress={handleNext}
          loading={loading}
          disabled={!selected}
          style={styles.btn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: SPACE.xl, gap: SPACE.md },
  title: { fontSize: 32, ...FONTS.heading, color: COLORS.text },
  subtitle: { fontSize: 15, color: COLORS.textSub, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.full,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.lg,
    minWidth: '45%',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  chipText: { fontSize: 14, color: COLORS.textSub, ...FONTS.subheading },
  chipTextActive: { color: '#fff' },
  btn: { marginTop: SPACE.md, alignSelf: 'stretch' },
});
