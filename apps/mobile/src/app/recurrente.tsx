import { useState } from 'react';
import { Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  api,
  friendlyError,
  parseAmount,
  RECURRENCE_LABEL,
  todayISO,
  validateName,
  validatePositive,
  type CategoryKind,
  type Recurrence,
} from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { supabase } from '@/lib/supabase';
import { Button, Chips, Field, Input, Screen, Segmented } from '@/components/ui';

export default function RecurrenteModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, refresh } = useFinance();
  const item = data?.recurring.find((r) => r.id === id);
  const accounts = (data?.accounts ?? []).filter((a) => !a.archived || a.id === item?.account_id);
  const [kind, setKind] = useState<CategoryKind>(item?.kind ?? 'expense');
  const [name, setName] = useState(item?.name ?? '');
  const [amount, setAmount] = useState(item ? String(item.amount) : '');
  const [accountId, setAccountId] = useState(item?.account_id ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState(item?.category_id ?? '');
  const [cadence, setCadence] = useState<Recurrence>(item?.cadence ?? 'monthly');
  const [next, setNext] = useState(item?.next_date ?? todayISO());
  const [active, setActive] = useState(item?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    const v = parseAmount(amount);
    const e: Record<string, string> = {};
    const n = validateName(name);
    if (n) e.name = n;
    const a = validatePositive(v);
    if (a) e.amount = a;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) e.next = 'Usa el formato AAAA-MM-DD.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.saveRecurring(
        supabase,
        { name: name.trim(), kind, account_id: accountId, category_id: categoryId || null, amount: v!, cadence, next_date: next, active },
        item?.id,
      );
      await refresh();
      router.back();
    } catch (x) {
      Alert.alert('No se pudo guardar', friendlyError(x));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item) return;
    try {
      await api.deleteRecurring(supabase, item.id);
      await refresh();
      router.back();
    } catch (x) {
      Alert.alert('No se pudo eliminar', friendlyError(x));
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: item ? 'Editar pago recurrente' : 'Nuevo pago recurrente' }} />
      <Segmented
        value={kind}
        onChange={(k) => {
          setKind(k);
          setCategoryId('');
        }}
        options={[
          { value: 'expense', label: 'Gasto' },
          { value: 'income', label: 'Ingreso' },
        ]}
      />
      <Field label="Nombre" error={errors.name}>
        <Input value={name} onChangeText={setName} placeholder="Arriendo, Netflix, Salario…" maxLength={60} />
      </Field>
      <Field label="Monto" error={errors.amount}>
        <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
      </Field>
      <Field label="Cuenta">
        <Chips value={accountId} onChange={setAccountId} options={accounts.map((a) => ({ value: a.id, label: `${a.name} · ${a.currency}`, color: a.color }))} />
      </Field>
      <Field label="Categoría">
        <Chips
          value={categoryId}
          onChange={setCategoryId}
          options={(data?.categories ?? []).filter((c) => c.kind === kind && !c.archived).map((c) => ({ value: c.id, label: c.name, color: c.color }))}
        />
      </Field>
      <Field label="Frecuencia">
        <Chips value={cadence} onChange={setCadence} options={(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => ({ value: r, label: RECURRENCE_LABEL[r] }))} />
      </Field>
      <Field label="Próxima fecha" error={errors.next}>
        <Input value={next} onChangeText={setNext} maxLength={10} keyboardType="numbers-and-punctuation" />
      </Field>
      {item ? (
        <Field label="Estado">
          <Segmented
            value={active ? 'on' : 'off'}
            onChange={(v) => setActive(v === 'on')}
            options={[
              { value: 'on', label: 'Activo' },
              { value: 'off', label: 'Pausado' },
            ]}
          />
        </Field>
      ) : null}
      <Button variant="primary" title="Guardar" onPress={save} loading={busy} />
      {item ? <Button variant="danger" title="Eliminar" onPress={remove} /> : null}
    </Screen>
  );
}
