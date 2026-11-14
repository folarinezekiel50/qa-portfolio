import React from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const colors = {
  primary: '#0b5cff',
  primaryDark: '#0842b8',
  bg: '#f4f6fb',
  card: '#ffffff',
  text: '#13182b',
  muted: '#5d6478',
  border: '#d9deea',
  danger: '#c62828',
  dangerBg: '#fdecea',
  success: '#1b7f3b',
};

export function Screen({ title, onBack, right, children, testID }: {
  title: string; onBack?: () => void; right?: React.ReactNode; children: React.ReactNode; testID?: string;
}) {
  return (
    <SafeAreaView style={styles.safe} testID={testID}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} testID="header.back" accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12}>
            <Text style={styles.headerLink}>‹ Back</Text>
          </Pressable>
        ) : <View style={{ width: 56 }} />}
        <Text style={styles.headerTitle} accessibilityRole="header">{title}</Text>
        <View style={{ minWidth: 56, alignItems: 'flex-end' }}>{right}</View>
      </View>
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', testID }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'secondary'; testID?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        pressed && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
      ]}
    >
      {loading
        ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} testID={testID ? `${testID}.loading` : undefined} />
        : <Text style={[styles.buttonText, variant === 'secondary' && { color: colors.primary }]}>{title}</Text>}
    </Pressable>
  );
}

export function TextField({ label, error, testID, ...props }: TextInputProps & { label: string; error?: string; testID: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? { borderColor: colors.danger } : null]}
        {...props}
      />
      {error ? <Text style={styles.fieldError} testID={`${testID}.error`}>{error}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message, testID, onRetry }: { message: string; testID: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorBanner} testID={testID} accessibilityRole="alert">
      <Text style={{ color: colors.danger, flex: 1 }}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} testID={`${testID}.retry`} accessibilityRole="button">
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, onPress, testID }: { children: React.ReactNode; onPress?: () => void; testID?: string }) {
  const content = <View style={styles.card}>{children}</View>;
  return onPress
    ? <Pressable testID={testID} onPress={onPress} accessibilityRole="button">{content}</Pressable>
    : <View testID={testID}>{content}</View>;
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  headerLink: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  body: { flex: 1, padding: 16 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: colors.text,
  },
  fieldError: { color: colors.danger, marginTop: 4, fontSize: 13 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.dangerBg,
    padding: 12, borderRadius: 10, marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  muted: { color: colors.muted },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  amount: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 6 },
});
