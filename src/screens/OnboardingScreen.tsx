import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { COLORS, RADIUS, SPACE, FONTS } from '../constants/theme';
import AuroraBackground from '../components/AuroraBackground';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'> };

const SLIDES = [
  {
    title: 'Welcome to Vocalis',
    subtitle: 'Your journey to social confidence starts here',
    desc: 'A science-backed app designed to help you overcome social anxiety step by step.',
  },
  {
    title: 'Guided Challenges',
    subtitle: 'Science-backed exposure therapy, personalized to you',
    desc: 'Each challenge is calibrated to your anxiety level and builds on the last.',
  },
  {
    title: 'Track Your Progress',
    subtitle: 'Build momentum with every interaction',
    desc: 'Earn XP, level up, and watch your social confidence grow day by day.',
  },
];

export default function OnboardingScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goToNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setCurrentIndex((i) => i + 1);
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    } else {
      navigation.navigate('Auth');
    }
  };

  const slide = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { overflow: 'hidden' }]}>
      <AuroraBackground />
      <View style={[styles.inner, { paddingTop: insets.top + SPACE.xl, paddingBottom: insets.bottom + SPACE.lg }]}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
          <Text style={styles.desc}>{slide.desc}</Text>
        </Animated.View>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={goToNext} activeOpacity={0.85} style={styles.btnWrapper}>
          <LinearGradient
            colors={['#5B8CDB', '#7C6FCD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Next →'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={() => navigation.navigate('Auth')} style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.xl,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.md,
  },
  title: {
    fontSize: 32,
    ...FONTS.heading,
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    ...FONTS.subheading,
    color: COLORS.primaryLight,
    textAlign: 'center',
  },
  desc: {
    fontSize: 15,
    ...FONTS.body,
    color: COLORS.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: SPACE.sm,
  },
  dots: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginBottom: SPACE.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceHi,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
  btnWrapper: {
    alignSelf: 'stretch',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACE.md,
  },
  btn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    ...FONTS.heading,
  },
  skip: {
    padding: SPACE.sm,
  },
  skipText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
