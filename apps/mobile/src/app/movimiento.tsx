import { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  api,
  crossRate,
  formatMoney,
  friendlyError,
  parseAmount,
  todayISO,
  toISODate,
  transactionRow,
  validateTransaction,
  type FieldErrors,
  type Transaction,
  type TransactionKind,
} from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { supabase } from '@/lib/supabase';
import { Button, Chips, Field, Input, Screen, Segmented, Text } from '@/components/ui';

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISODate(d);
}

export default function MovimientoModal() {
  const { id, kind: kindParam } = useLocalSearchParams<{ id?: string; kind?: TransactionKind }>();
  const { data, accountsById, refresh } = useFinance();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [kind, setKind] = useState<TransactionKind>(kindParam ?? 'expense');
  const accounts = useMemo(() => (data?.accounts ?? []).filter((a) => !a.archived || a.id === editing?.account_id), [data, editing]);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getTransaction(supabase, id).then((t) => {
      if (!t) return;
      setEditing(t);
      setKind(t.kind);
      setAccountId(t.account_id);
      setToAccountId(t.transfer_account_id ?? '');
      setAmount(String(t.amount));
      setToAmount(t.transfer_amount ? String(t.transfer_amount) : '');
      setCategoryId(t.category_id ?? '');
      setDate(t.occurred_on);
      setNote(t.note ?? '');
    });
  }, [id]);

  const from = accountsById.get(accountId);
  const to = accountsById.get(toAccountId);
  const cross = kind === 'transfer' && from && to && from.currency !== to.currency;
  const suggested = cross && data ? crossRate(from.currency, to.currency, data.rates) : null;
  const parsed = parseAmount(amount);
  const categories = (data?.categories ?? []).filter((c) => c.kind === kind && (!c.archived || c.id === categoryId));

  async function save() {
    const draft = {
      kind,
      account_id: accountId,
      amount: parsed,
      category_id: kind === 'transfer' ? null : categoryId || null,
      transfer_account_id: kind === 'transfer' ? toAccountId || null : null,
      transfer_amount: cross ? parseAmount(toAmount) ?? (parsed && suggested ? Math.round(parsed * suggested * 100) / 100 : null) : null,
      occurred_on: date,
      note,
    };
    const e = validateTransaction(draft);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.saveTransaction(supabase, transactionRow(draft, !cross), editing?.id);
      await refresh();
      router.back();
    } catch (err) {
      Alert.alert('No se pudo guardar', friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (!editing) return;
    Alert.alert('Eliminar movimiento', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTransaction(supabase, editing.id);
            await refresh();
            router.back();
          } catch (err) {
            Alert.alert('No se pudo eliminar', friendlyError(err));
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editing ? 'Editar movimiento' : 'Nuevo movimiento' }} />
      <Screen>
        <Segmented
          value={kind}
          onChange={(k) => {
            setKind(k);
            setCategoryId('');
          }}
          options={[
            { value: 'expense', label: 'Gasto' },
            { value: 'income', label: 'Ingreso' },
            { value: 'transfer', label: 'Transferir' },
          ]}
        />
        <Field label={`Monto${from ? ` en ${from.currency}` : ''}`} error={errors.amount}>
          <Input large value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" autoFocus={!id} />
        </Field>
        <Field label={kind === 'transfer' ? 'Desde' : 'Cuenta'} error={errors.account_id}>
          <Chips value={accountId} onChange={setAccountId} options={accounts.map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}`, color: a.color }))} />
        </Field>
        {kind === 'transfer' ? (
          <>
            <Field label="Hacia" error={errors.transfer_account_id}>
              <Chips
                value={toAccountId}
                onChange={setToAccountId}
                options={accounts.filter((a) => a.id !== accountId).map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}`, color: a.color }))}
              />
            </Field>
            {cross && to ? (
              <Field
                label={`Recibido en ${to.currency}`}
                hint={
                  suggested && parsed
                    ? `Con la tasa del día serían ${formatMoney(parsed * suggested, to.currency)}. Escribe lo que realmente llegó.`
                    : 'Escribe lo que realmente llegó.'
                }
              >
                <Input value={toAmount} onChangeText={setToAmount} keyboardType="decimal-pad" placeholder="0" />
              </Field>
            ) : null}
          </>
        ) : (
          <Field label="Categoría">
            <Chips value={categoryId} onChange={setCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name, color: c.color }))} />
          </Field>
        )}
        <Field label="Fecha" error={errors.occurred_on} hint="Formato AAAA-MM-DD">
          <View style={{ gap: 8 }}>
            <Chips
              value={date === todayISO() ? 'hoy' : date === yesterday() ? 'ayer' : null}
              onChange={(v) => setDate(v === 'hoy' ? todayISO() : yesterday())}
              options={[
                { value: 'hoy', label: 'Hoy' },
                { value: 'ayer', label: 'Ayer' },
              ]}
            />
            <Input value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" maxLength={10} />
          </View>
        </Field>
        <Field label="Nota" error={errors.note}>
          <Input value={note} onChangeText={setNote} placeholder="Opcional" maxLength={280} />
        </Field>
        <Button variant="primary" title={editing ? 'Guardar cambios' : 'Guardar'} onPress={save} loading={busy} />
        {editing ? <Button variant="danger" title="Eliminar" onPress={remove} /> : null}
        {!accounts.length ? <Text tone="muted">Primero crea una cuenta en Más → Cuentas.</Text> : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
