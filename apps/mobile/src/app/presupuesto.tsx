import { useState } from 'react';
import { Alert } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { api, CURRENCIES, friendlyError, parseAmount, validatePositive, type Currency } from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { supabase } from '@/lib/supabase';
import { Button, Chips, Field, Input, Screen, Text } from '@/components/ui';

export default function PresupuestoModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, refresh } = useFinance();
  const budget = data?.budgets.find((b) => b.id === id);
  const used = new Set(data?.budgets.map((b) => b.category_id));
  const options = (data?.categories ?? []).filter((c) => c.kind === 'expense' && !c.archived && (!used.has(c.id) || c.id === budget?.category_id));
  const [categoryId, setCategoryId] = useState(budget?.category_id ?? options[0]?.id ?? '');
  const [amount, setAmount] = useState(budget ? String(budget.amount) : '');
  const [currency, setCurrency] = useState<Currency>(budget?.currency ?? data?.profile.base_currency ?? 'COP');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const v = parseAmount(amount);
    const e = !categoryId ? 'Elige una categoría.' : validatePositive(v);
    if (e) return setErr(e);
    setBusy(true);
    try {
      if (budget && budget.category_id !== categoryId) await api.deleteBudget(supabase, budget.id);
      await api.saveBudget(supabase, { category_id: categoryId, amount: v!, currency });
      await refresh();
      router.back();
    } catch (x) {
      Alert.alert('No se pudo guardar', friendlyError(x));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!budget) return;
    try {
      await api.deleteBudget(supabase, budget.id);
      await refresh();
      router.back();
    } catch (x) {
      Alert.alert('No se pudo eliminar', friendlyError(x));
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: budget ? 'Editar presupuesto' : 'Nuevo presupuesto' }} />
      {options.length === 0 ? (
        <Text tone="muted">Todas tus categorías de gasto ya tienen presupuesto.</Text>
      ) : (
        <>
          <Field label="Categoría">
            <Chips value={categoryId} onChange={setCategoryId} options={options.map((c) => ({ value: c.id, label: c.name, color: c.color }))} />
          </Field>
          <Field label="Tope mensual" error={err}>
            <Input large value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
          </Field>
          <Field label="Moneda">
            <Chips value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          </Field>
          <Button variant="primary" title="Guardar" onPress={save} loading={busy} />
          {budget ? <Button variant="danger" title="Eliminar presupuesto" onPress={remove} /> : null}
        </>
      )}
    </Screen>
  );
}
