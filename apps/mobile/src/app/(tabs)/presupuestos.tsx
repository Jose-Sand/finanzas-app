import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { budgetProgress, monthKey, monthLabel, monthRange, todayISO } from '@caudal/shared';
import { useFinance, useTransactions } from '@/lib/finance';
import { useTheme } from '@/lib/theme';
import { Button, Card, Dot, Empty, Money, Progress, Screen, Text } from '@/components/ui';

export default function Presupuestos() {
  const { c } = useTheme();
  const { data, accountsById, categoriesById } = useFinance();
  const today = todayISO();
  const month = monthKey(today);
  const r = monthRange(month);
  const { rows } = useTransactions({ from: r.start, to: r.end, kind: 'expense' });
  if (!data) return <Screen>{null}</Screen>;
  const progress = budgetProgress(data.budgets, rows ?? [], categoriesById, accountsById, data.rates, month, Number(today.slice(8, 10)));

  return (
    <Screen>
      <Text tone="muted">Topes mensuales por categoría · {monthLabel(month, true)}</Text>
      {progress.length === 0 ? (
        <Empty
          title="Aún no tienes presupuestos"
          body="Ponle un tope mensual a mercado o restaurantes y te avisamos cuando vayas más rápido de lo previsto."
          action={<Button variant="primary" title="Crear presupuesto" onPress={() => router.push('/presupuesto')} />}
        />
      ) : (
        <>
          {progress.map((p) => {
            const color = p.status === 'over' ? c.expense : p.status === 'warning' ? c.warning : c.income;
            return (
              <Pressable key={p.budget.id} onPress={() => router.push({ pathname: '/presupuesto', params: { id: p.budget.id } })}>
                <Card style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Dot color={p.category?.color ?? '#8A94A6'} />
                      <Text variant="medium">{p.category?.name}</Text>
                    </View>
                    <Text variant="small" style={{ color }}>
                      {p.status === 'over' ? 'Excedido' : p.status === 'warning' ? 'Vas rápido' : 'A tiempo'}
                    </Text>
                  </View>
                  <Text>
                    <Money value={p.spent} currency={p.budget.currency} variant="title" />
                    <Text tone="muted"> de </Text>
                    <Money value={p.budget.amount} currency={p.budget.currency} tone="muted" variant="body" />
                  </Text>
                  <Progress ratio={p.ratio} marker={p.pace} color={color} />
                  <Text variant="small" tone="muted">
                    {p.remaining >= 0 ? 'Te quedan ' : 'Te pasaste por '}
                    <Money value={Math.abs(p.remaining)} currency={p.budget.currency} variant="small" tone={p.remaining >= 0 ? 'ink' : 'expense'} />
                  </Text>
                </Card>
              </Pressable>
            );
          })}
          <Button title="Nuevo presupuesto" onPress={() => router.push('/presupuesto')} />
        </>
      )}
    </Screen>
  );
}
