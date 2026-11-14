import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { api, friendlyMessage, type Account, type Transaction } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { formatMinor } from '../utils/money';
import { Button, Card, ErrorBanner, Screen, colors, styles } from '../components/ui';

const PAGE_SIZE = 10;

export function AccountDetailScreen({ account: initial }: { account: Account }) {
  const { token } = useAuth();
  const nav = useNavigation();
  const [account, setAccount] = useState(initial);
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [fresh, page] = await Promise.all([
        api.getAccount(token!, initial.id),
        api.getTransactions(token!, initial.id, PAGE_SIZE, 0),
      ]);
      setAccount(fresh);
      setItems(page.items);
      setTotal(page.total);
    } catch (e) {
      setError(friendlyMessage(e));
    }
  }, [token, initial.id]);

  useEffect(() => { load(); }, [load]);

  async function loadMore() {
    if (loadingMore || total === null || items.length >= total) return;
    setLoadingMore(true);
    try {
      const page = await api.getTransactions(token!, initial.id, PAGE_SIZE, items.length);
      setItems((prev) => [...prev, ...page.items]);
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Screen title={account.name} onBack={nav.goBack} testID="detail.screen">
      <Card>
        <Text style={styles.muted}>Available balance</Text>
        <Text style={styles.amount} testID="detail.balance">{formatMinor(account.balanceMinor)}</Text>
        <Text style={styles.muted}>{account.id}</Text>
      </Card>
      <Button title="Pay from this account" testID="detail.transfer" onPress={() => nav.push({ name: 'Transfer', fromAccountId: account.id })} />

      <Text style={[styles.title, { marginTop: 24, marginBottom: 8 }]}>Transactions</Text>
      {error ? <ErrorBanner message={error} testID="detail.error" onRetry={load} /> : null}
      {total === null && !error ? <ActivityIndicator testID="detail.loading" /> : null}

      <FlatList
        testID="detail.transactions"
        data={items}
        keyExtractor={(t) => t.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={total === 0 ? <Text style={styles.muted} testID="detail.empty">No transactions yet.</Text> : undefined}
        ListFooterComponent={loadingMore ? <ActivityIndicator /> : undefined}
        renderItem={({ item }) => (
          <View testID={`txn.${item.id}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.muted}>{new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
            <Text style={{ fontWeight: '700', color: item.amountMinor < 0 ? colors.text : colors.success }}>
              {item.amountMinor > 0 ? '+' : ''}{formatMinor(item.amountMinor)}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}
