import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { api, friendlyMessage, type Account } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { formatMinor } from '../utils/money';
import { Button, Card, ErrorBanner, Screen, colors, styles } from '../components/ui';

export function AccountsScreen() {
  const { token, user, logout } = useAuth();
  const nav = useNavigation();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setAccounts(await api.getAccounts(token!));
    } catch (e) {
      setError(friendlyMessage(e));
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const total = accounts?.reduce((sum, a) => sum + a.balanceMinor, 0) ?? 0;

  return (
    <Screen
      title="Accounts"
      testID="accounts.screen"
      right={
        <Pressable onPress={logout} testID="accounts.logout" accessibilityRole="button" hitSlop={12}>
          <Text style={{ color: colors.primary, fontWeight: '600' }}>Log out</Text>
        </Pressable>
      }
    >
      <Text style={[styles.title, { marginBottom: 4 }]} testID="accounts.greeting">Hello, {user?.name.split(' ')[0]}</Text>
      {accounts ? <Text style={[styles.muted, { marginBottom: 16 }]} testID="accounts.total">Total balance {formatMinor(total)}</Text> : null}

      {error ? <ErrorBanner message={error} testID="accounts.error" onRetry={load} /> : null}

      {!accounts && !error ? <ActivityIndicator testID="accounts.loading" size="large" style={{ marginTop: 32 }} /> : null}

      {accounts ? (
        <FlatList
          testID="accounts.list"
          data={accounts}
          keyExtractor={(a) => a.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text testID="accounts.empty" style={styles.muted}>You have no accounts yet.</Text>}
          renderItem={({ item }) => (
            <Card testID={`account.card.${item.id}`} onPress={() => nav.push({ name: 'AccountDetail', account: item })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.muted}>{item.type === 'savings' ? 'Savings' : 'Current'}</Text>
              </View>
              <Text style={styles.muted}>{item.id}</Text>
              <Text style={styles.amount} testID={`account.balance.${item.id}`}>{formatMinor(item.balanceMinor)}</Text>
            </Card>
          )}
          ListFooterComponent={
            <Button testID="accounts.transfer" title="Make a payment" onPress={() => nav.push({ name: 'Transfer' })} />
          }
        />
      ) : null}
    </Screen>
  );
}
