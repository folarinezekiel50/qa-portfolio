import React from 'react';
import { Text, View } from 'react-native';
import type { Transfer } from '../api/client';
import { useNavigation } from '../navigation/Navigator';
import { formatMinor } from '../utils/money';
import { Button, Card, Screen, colors, styles } from '../components/ui';

export function TransferSuccessScreen({ transfer, payeeName }: { transfer: Transfer; payeeName: string }) {
  const nav = useNavigation();
  return (
    <Screen title="Payment sent" testID="success.screen">
      <View style={{ alignItems: 'center', marginVertical: 24 }}>
        <Text style={{ fontSize: 48, color: colors.success }}>✓</Text>
        <Text style={[styles.title, { fontSize: 20, textAlign: 'center' }]} testID="success.message">
          You sent {formatMinor(transfer.amountMinor)} to {payeeName}
        </Text>
      </View>
      <Card>
        <Text style={styles.muted}>Payment ID</Text>
        <Text style={styles.title} testID="success.id" selectable>{transfer.id}</Text>
        {transfer.reference ? (
          <>
            <Text style={[styles.muted, { marginTop: 12 }]}>Reference</Text>
            <Text style={styles.title}>{transfer.reference}</Text>
          </>
        ) : null}
      </Card>
      <Button testID="success.done" title="Back to accounts" onPress={() => nav.reset({ name: 'Accounts' })} />
    </Screen>
  );
}
