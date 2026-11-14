import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { friendlyMessage } from '../api/client';
import { validateLogin } from '../utils/validation';
import { Button, ErrorBanner, TextField, colors, styles } from '../components/ui';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    const errors = validateLogin(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(friendlyMessage(e));
      setPassword(''); // never keep a rejected password on screen
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} testID="login.screen">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: colors.primary }}>QA Bank</Text>
          <Text style={styles.muted}>Demo banking app for test automation</Text>
        </View>

        {error ? <ErrorBanner message={error} testID="login.error" /> : null}

        <TextField
          testID="login.email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          error={fieldErrors.email}
          placeholder="you@example.com"
        />
        <TextField
          testID="login.password"
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          error={fieldErrors.password}
          onSubmitEditing={onSubmit}
          returnKeyType="go"
        />
        <Button testID="login.submit" title="Log in" onPress={onSubmit} loading={loading} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
