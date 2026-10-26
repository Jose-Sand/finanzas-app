import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ACCOUNT_KIND_LABEL, convert } from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { Button, Card, Money, Screen, Text } from '@/components/ui';

export default function Cuentas() {
  const { data } = useFinance();
  if (!data) return <Screen>{null}</Screen>;
  const base = data.profile.base_currency;
  const balances = new Map(data.balances.map((b) => [b.account_id, b.balance]));
  const sorted = [...data.accounts].sort((a, b) => Number(a.archived) - Number(b.archived));

  return (
    <Screen>
      <Text tone="muted">Cada cuenta lleva su propia moneda. El total se convierte con la tasa del día.</Text>
      {sorted.map((a) => {
        const bal = balances.get(a.id) ?? a.opening_balance;
        const inBase = a.currency !== base ? convert(bal, a.currency, base, data.rates) : null;
        return (
          <Pressable key={a.id} onPress={() => router.push({ pathname: '/cuenta', params: { id: a.id } })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: a.archived ? 0.55 : 1 }}>
              <View style={{ width: 5, alignSelf: 'stretch', borderRadius: 3, backgroundColor: a.color }} />
              <View style={{ flex: 1 }}>
                <Text variant="medium">{a.name}</Text>
                <Text variant="small" tone="muted">
                  {a.archived ? 'Archivada' : ACCOUNT_KIND_LABEL[a.kind]} · {a.currency}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Money value={bal} currency={a.currency} variant="title" tone={bal < 0 ? 'expense' : 'ink'} />
                {inBase !== null ? <Money value={inBase} currency={base} variant="small" tone="muted" /> : null}
              </View>
            </Card>
          </Pressable>
        );
      })}
      <Button variant="primary" title="Nueva cuenta" onPress={() => router.push('/cuenta')} />
    </Screen>
  );
}
