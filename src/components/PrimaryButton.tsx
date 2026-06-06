import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACE, FONTS } from '../constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradient?: [string, string];
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  gradient,
  variant = 'primary',
}: Props) {
  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    const colors = gradient ?? ['#5B8CDB', '#7C6FCD'];
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.wrapper, isDisabled && styles.disabled, style]}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={colors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.text, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.wrapper, styles.danger, isDisabled && styles.disabled, style]}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.text, textStyle]}>{title}</Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.wrapper, styles.secondary, isDisabled && styles.disabled, style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.textSub} />
      ) : (
        <Text style={[styles.secondaryText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    ...FONTS.heading,
  },
  secondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  secondaryText: {
    color: COLORS.textSub,
    fontSize: 16,
    ...FONTS.subheading,
  },
  danger: {
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  disabled: {
    opacity: 0.5,
  },
});
