import { useState } from 'react';
import { Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  ACCOUNT_KIND_LABEL,
  api,
  CURRENCIES,
  friendlyError,
  parseAmount,
  SWATCHES,
  validateName,
  type AccountKind,
  type Currency,
} from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { supabase } from '@/lib/supabase';
import { Button, Chips, Field, Input, Screen } from '@/components/ui';

const KINDS = Object.keys(ACCOUNT_KIND_LABEL) as AccountKind[];

export default function CuentaModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, refresh } = useFinance();
  const account = data?.accounts.find((a) => a.id === id);
  const [name, setName] = useState(account?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'checking');
  const [currency, setCurrency] = useState<Currency>(account?.currency ?? data?.profile.base_currency ?? 'COP');
  const [opening, setOpening] = useState(account ? String(Math.abs(account.opening_balance)) : '');
  const [color, setColor] = useState<string>(account?.color ?? SWATCHES[3]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const e = validateName(name);
    if (e) return setErr(e);
    const ob = opening.trim() ? parseAmount(opening) : 0;
    if (ob === null) return setErr('El saldo inicial no es un número válido.');
    setBusy(true);
    try {
      await api.saveAccount(
        supabase,
        { name: name.trim(), kind, currency, opening_balance: kind === 'credit_card' ? -Math.abs(ob) : ob, color },
        account?.id,
      );
      await refresh();
      router.back();
    } catch (x) {
      Alert.alert('No se pudo guardar', friendlyError(x));
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!account) return;
    try {
      await api.saveAccount(supabase, { archived: !account.archived }, account.id);
      await refresh();
      router.back();
    } catch (x) {
      Alert.alert('No se pudo guardar', friendlyError(x));
    }
  }

  function remove() {
    if (!account) return;
    Alert.alert('Eliminar cuenta', `Se borrarán "${account.name}" y todos sus movimientos. Si solo quieres ocultarla, archívala.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteAccount(supabase, account.id);
            await refresh();
            router.back();
          } catch (x) {
            Alert.alert('No se pudo eliminar', friendlyError(x));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: account ? 'Editar cuenta' : 'Nueva cuenta' }} />
      <Field label="Nombre" error={err}>
        <Input value={name} onChangeText={setName} placeholder="Bancolombia, Nequi, Wise…" maxLength={60} />
      </Field>
      <Field label="Tipo">
        <Chips value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: ACCOUNT_KIND_LABEL[k] }))} />
      </Field>
      <Field label="Moneda" hint={account ? 'La moneda no se puede cambiar después de crear la cuenta.' : undefined}>
        {account ? (
          <Chips value={currency} onChange={() => undefined} options={[{ value: currency, label: currency }]} />
        ) : (
          <Chips value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
        )}
      </Field>
      <Field label={kind === 'credit_card' ? 'Deuda actual' : 'Saldo inicial'}>
        <Input value={opening} onChangeText={setOpening} keyboardType="decimal-pad" placeholder="0" />
      </Field>
      <Field label="Color">
        <Chips value={color} onChange={setColor} options={SWATCHES.map((s) => ({ value: s, label: ' ', color: s }))} />
      </Field>
      <Button variant="primary" title={account ? 'Guardar cambios' : 'Crear cuenta'} onPress={save} loading={busy} />
      {account ? (
        <>
          <Button title={account.archived ? 'Restaurar cuenta' : 'Archivar cuenta'} onPress={archive} />
          <Button variant="danger" title="Eliminar cuenta" onPress={remove} />
        </>
      ) : null}
    </Screen>
  );
}
