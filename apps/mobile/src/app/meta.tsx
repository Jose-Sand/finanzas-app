import { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { api, CURRENCIES, friendlyError, parseAmount, SWATCHES, validateName, validatePositive, type Currency } from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { supabase } from '@/lib/supabase';
import { Button, Chips, Field, Input, Screen } from '@/components/ui';

export default function MetaModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, refresh } = useFinance();
  const goal = data?.goals.find((g) => g.id === id);
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? String(goal.target_amount) : '');
  const [saved, setSaved] = useState(goal ? String(goal.saved_amount) : '');
  const [add, setAdd] = useState('');
  const [currency, setCurrency] = useState<Currency>(goal?.currency ?? data?.profile.base_currency ?? 'COP');
  const [date, setDate] = useState(goal?.target_date ?? '');
  const [color, setColor] = useState<string>(goal?.color ?? SWATCHES[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function save(extra = 0) {
    const t = parseAmount(target);
    const s = (saved.trim() ? parseAmount(saved) : 0) ?? -1;
    const e: Record<string, string> = {};
    const n = validateName(name);
    if (n) e.name = n;
    const tp = validatePositive(t, 'La meta');
    if (tp) e.target = tp;
    if (s < 0) e.saved = 'Escribe un monto válido.';
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) e.date = 'Usa el formato AAAA-MM-DD.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.saveGoal(
        supabase,
        { name: name.trim(), target_amount: t!, saved_amount: Math.max(0, s + extra), currency, target_date: date || null, color },
        goal?.id,
      );
      await refresh();
      router.back();
    } catch (x) {
      Alert.alert('No se pudo guardar', friendlyError(x));
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    if (!goal) return;
    Alert.alert('Eliminar meta', `¿Eliminar "${goal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api.deleteGoal(supabase, goal.id).catch((x) => Alert.alert('No se pudo eliminar', friendlyError(x)));
          await refresh();
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: goal ? goal.name : 'Nueva meta' }} />
      {goal ? (
        <Field label="Abonar" hint="Suma este monto a lo ahorrado.">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input value={add} onChangeText={setAdd} keyboardType="decimal-pad" placeholder="0" style={{ flex: 1 }} />
            <Button
              title="Abonar"
              variant="primary"
              onPress={() => {
                const v = parseAmount(add);
                if (!v || v <= 0) return setErrors({ add: 'Escribe un monto.' });
                void save(v);
              }}
            />
          </View>
        </Field>
      ) : null}
      <Field label="Nombre" error={errors.name}>
        <Input value={name} onChangeText={setName} placeholder="Fondo de emergencia" maxLength={60} />
      </Field>
      <Field label="Monto objetivo" error={errors.target}>
        <Input value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder="0" />
      </Field>
      <Field label="Moneda">
        <Chips value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
      </Field>
      <Field label="Ya ahorrado" error={errors.saved}>
        <Input value={saved} onChangeText={setSaved} keyboardType="decimal-pad" placeholder="0" />
      </Field>
      <Field label="Fecha límite" error={errors.date} hint="Opcional, formato AAAA-MM-DD.">
        <Input value={date} onChangeText={setDate} placeholder="2027-06-30" maxLength={10} keyboardType="numbers-and-punctuation" />
      </Field>
      <Field label="Color">
        <Chips value={color} onChange={setColor} options={SWATCHES.map((s) => ({ value: s, label: ' ', color: s }))} />
      </Field>
      <Button variant="primary" title={goal ? 'Guardar cambios' : 'Crear meta'} onPress={() => save()} loading={busy} />
      {goal ? <Button variant="danger" title="Eliminar meta" onPress={remove} /> : null}
    </Screen>
  );
}
