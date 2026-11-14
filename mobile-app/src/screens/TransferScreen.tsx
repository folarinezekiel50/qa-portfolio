import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { api, friendlyMessage, type Account, type Payee } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../navigation/Navigator';
import { formatMinor } from '../utils/money';
import { validateTransfer, type TransferFormErrors } from '../utils/validation';
import { Button, Card, ErrorBanner, Screen, TextField, colors, styles } from '../components/ui';

interface Destination { accountId: string; label: string; kind: 'own' | 'payee' }

const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function Chip({ label, selected, onPress, testID }: { label: string; selected: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, marginBottom: 8,
        borderWidth: 1, borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? '#e8efff' : colors.card,
      }}
    >
      <Text style={{ color: selected ? colors.primary : colors.text, fontWeight: selected ? '700' : '400' }}>{label}</Text>
    </Pressable>
  );
}

export function TransferScreen({ fromAccountId: initialFrom }: { fromAccountId?: string }) {
  const { token } = useAuth();
  const nav = useNavigation();

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [from, setFrom] = useState<string | undefined>(initialFrom);
  const [to, setTo] = useState<string | undefined>();
  const [amountText, setAmountText] = useState('');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<TransferFormErrors>({});
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [amountMinor, setAmountMinor] = useState(0);

  // One idempotency key per confirmation attempt: retrying after a timeout cannot pay twice.
  const idempotencyKey = useRef(newKey());

  async function loadData() {
    setLoadError(null);
    try {
      const [a, p] = await Promise.all([api.getAccounts(token!), api.getPayees(token!)]);
      setAccounts(a);
      setPayees(p);
      if (!initialFrom && a.length) setFrom(a[0].id);
    } catch (e) {
      setLoadError(friendlyMessage(e));
    }
  }
  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fromAccount = accounts?.find((a) => a.id === from);
  const destinations: Destination[] = useMemo(() => [
    ...(accounts ?? []).filter((a) => a.id !== from).map((a) => ({ accountId: a.id, label: a.name, kind: 'own' as const })),
    ...payees.map((p) => ({ accountId: p.accountId, label: p.name, kind: 'payee' as const })),
  ], [accounts, payees, from]);
  const destination = destinations.find((d) => d.accountId === to);

  function onContinue() {
    const result = validateTransfer({ fromAccountId: from, toAccountId: to, amountText, reference, availableMinor: fromAccount?.balanceMinor });
    setErrors(result.errors);
    if (Object.keys(result.errors).length) return;
    setAmountMinor(result.amountMinor!);
    setSubmitError(null);
    idempotencyKey.current = newKey();
    setStep('review');
  }

  async function onConfirm() {
    if (submitting) return; // guard against double taps
    setSubmitting(true);
    setSubmitError(null);
    try {
      const transfer = await api.createTransfer(
        token!,
        { fromAccountId: from!, toAccountId: to!, amountMinor, reference: reference.trim() },
        idempotencyKey.current,
      );
      nav.reset({ name: 'Accounts' });
      nav.push({ name: 'TransferSuccess', transfer, payeeName: destination?.label ?? to! });
    } catch (e) {
      setSubmitError(friendlyMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Screen title="Make a payment" onBack={nav.goBack} testID="transfer.screen">
        <ErrorBanner message={loadError} testID="transfer.loadError" onRetry={loadData} />
      </Screen>
    );
  }
  if (!accounts) {
    return (
      <Screen title="Make a payment" onBack={nav.goBack} testID="transfer.screen">
        <ActivityIndicator testID="transfer.loading" size="large" style={{ marginTop: 32 }} />
      </Screen>
    );
  }

  if (step === 'review') {
    return (
      <Screen title="Check your payment" onBack={() => setStep('form')} testID="transfer.review">
        {submitError ? <ErrorBanner message={submitError} testID="transfer.error" /> : null}
        <Card>
          <Text style={styles.muted}>Amount</Text>
          <Text style={styles.amount} testID="review.amount">{formatMinor(amountMinor)}</Text>
          <Text style={[styles.muted, { marginTop: 12 }]}>From</Text>
          <Text style={styles.title} testID="review.from">{fromAccount?.name} ({from})</Text>
          <Text style={[styles.muted, { marginTop: 12 }]}>To</Text>
          <Text style={styles.title} testID="review.to">{destination?.label} ({to})</Text>
          {reference.trim() ? (
            <>
              <Text style={[styles.muted, { marginTop: 12 }]}>Reference</Text>
              <Text style={styles.title} testID="review.reference">{reference.trim()}</Text>
            </>
          ) : null}
        </Card>
        <Button testID="transfer.confirm" title="Confirm and pay" onPress={onConfirm} loading={submitting} />
        <Button testID="transfer.edit" title="Edit payment" variant="secondary" onPress={() => setStep('form')} disabled={submitting} />
      </Screen>
    );
  }

  return (
    <Screen title="Make a payment" onBack={nav.goBack} testID="transfer.screen">
      <ScrollView keyboardShouldPersistTaps="handled" testID="transfer.scroll">
        <Text style={styles.label}>From</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {accounts.map((a) => (
            <Chip key={a.id} testID={`transfer.from.${a.id}`} label={`${a.name} · ${formatMinor(a.balanceMinor)}`} selected={from === a.id}
              onPress={() => { setFrom(a.id); if (to === a.id) setTo(undefined); }} />
          ))}
        </View>
        {errors.from ? <Text style={{ color: colors.danger, marginBottom: 8 }} testID="transfer.from.error">{errors.from}</Text> : null}

        <Text style={[styles.label, { marginTop: 12 }]}>To</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {destinations.map((d) => (
            <Chip key={d.accountId} testID={`transfer.to.${d.accountId}`} label={d.kind === 'payee' ? `${d.label} (payee)` : d.label}
              selected={to === d.accountId} onPress={() => setTo(d.accountId)} />
          ))}
        </View>
        {errors.to ? <Text style={{ color: colors.danger, marginBottom: 8 }} testID="transfer.to.error">{errors.to}</Text> : null}

        <View style={{ marginTop: 12 }}>
          <TextField testID="transfer.amount" label="Amount (£)" value={amountText} onChangeText={setAmountText}
            keyboardType="decimal-pad" placeholder="0.00" error={errors.amount} />
          <TextField testID="transfer.reference" label="Reference (optional)" value={reference} onChangeText={setReference}
            placeholder="e.g. Rent" error={errors.reference} maxLength={40} />
        </View>
        <Button testID="transfer.continue" title="Continue" onPress={onContinue} />
      </ScrollView>
    </Screen>
  );
}
