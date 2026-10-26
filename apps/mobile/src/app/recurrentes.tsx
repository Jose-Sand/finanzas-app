import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { api, dayLabel, friendlyError, monthlyEquivalent, RECURRENCE_LABEL, sumIn, todayISO } from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { supabase } from '@/lib/supabase';
import { Button, Card, Empty, Money, Screen, Text } from '@/components/ui';

export default function Recurrentes() {
  const { data, accountsById, refresh } = useFinance();
  const [posting, setPosting] = useState<string | null>(null);
  if (!data) return <Screen>{null}</Screen>;
  const today = todayISO();
  const base = data.profile.base_currency;
  const fixed = sumIn(
    data.recurring
      .filter((r) => r.active && r.kind === 'expense')
      .map((r) => ({ amount: monthlyEquivalent(r), currency: accountsById.get(r.account_id)?.currency ?? base })),
    base,
    data.rates,
  ).total;

  async function post(id: string) {
    setPosting(id);
    try {
      await api.postRecurring(supabase, id);
      await refresh();
    } catch (e) {
      Alert.alert('No se pudo registrar', friendlyError(e));
    } finally {
      setPosting(null);
    }
  }

  return (
    <Screen>
      {data.recurring.length === 0 ? (
        <Empty
          title="Agrega tus pagos fijos"
          body="Cuando sabes qué sale cada mes, sabes cuánto queda libre. Empieza por el arriendo o tus suscripciones."
          action={<Button variant="primary" title="Agregar pago recurrente" onPress={() => router.push('/recurrente')} />}
        />
      ) : (
        <>
          <Card>
            <Text variant="small" tone="muted">
              Gastos fijos al mes
            </Text>
            <Money value={fixed} currency={base} variant="display" />
          </Card>
          {data.recurring.map((r) => {
            const acc = accountsById.get(r.account_id);
            const late = r.active && r.next_date < today;
            return (
              <Pressable key={r.id} onPress={() => router.push({ pathname: '/recurrente', params: { id: r.id } })}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: r.active ? 1 : 0.55 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="medium" numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text variant="small" tone={late ? 'expense' : 'muted'}>
                      {RECURRENCE_LABEL[r.cadence]} · {r.active ? `${late ? 'Vencido' : 'Próximo'} ${dayLabel(r.next_date)}` : 'Pausado'}
                    </Text>
                    {acc ? <Money value={r.amount} currency={acc.currency} tone={r.kind === 'income' ? 'income' : 'ink'} /> : null}
                  </View>
                  {r.active ? <Button small title="Registrar" onPress={() => post(r.id)} loading={posting === r.id} /> : null}
                </Card>
              </Pressable>
            );
          })}
          <Button variant="primary" title="Nuevo pago recurrente" onPress={() => router.push('/recurrente')} />
        </>
      )}
    </Screen>
  );
}
