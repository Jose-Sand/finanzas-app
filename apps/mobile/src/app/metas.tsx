import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { dayLabel, goalProgress, todayISO } from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { Button, Card, Empty, Money, Progress, Screen, Text } from '@/components/ui';

export default function Metas() {
  const { data } = useFinance();
  if (!data) return <Screen>{null}</Screen>;
  const today = todayISO();
  const goals = data.goals.filter((g) => !g.archived).map((g) => goalProgress(g, today));

  return (
    <Screen>
      {goals.length === 0 ? (
        <Empty
          title="Ponle nombre a lo que quieres lograr"
          body="Un fondo de emergencia, un viaje, la cuota inicial de un apartamento. Define monto y fecha, y te decimos cuánto ahorrar al mes."
          action={<Button variant="primary" title="Crear meta" onPress={() => router.push('/meta')} />}
        />
      ) : (
        <>
          {goals.map(({ goal, ratio, remaining, monthlyNeeded, daysLeft }) => (
            <Pressable key={goal.id} onPress={() => router.push({ pathname: '/meta', params: { id: goal.id } })}>
              <Card style={{ gap: 10 }}>
                <View>
                  <Text variant="title">{goal.name}</Text>
                  <Text variant="small" tone={daysLeft !== null && daysLeft < 0 ? 'expense' : 'muted'}>
                    {goal.target_date ? `${daysLeft !== null && daysLeft < 0 ? 'Venció el' : 'Para el'} ${dayLabel(goal.target_date)}` : 'Sin fecha límite'}
                  </Text>
                </View>
                <Text>
                  <Money value={goal.saved_amount} currency={goal.currency} variant="title" />
                  <Text tone="muted"> de </Text>
                  <Money value={goal.target_amount} currency={goal.currency} tone="muted" variant="body" />
                </Text>
                <Progress ratio={ratio} color={goal.color} />
                <Text variant="small" tone={remaining <= 0 ? 'income' : 'muted'}>
                  {remaining <= 0 ? 'Meta cumplida' : monthlyNeeded !== null && (daysLeft ?? 0) > 0 ? 'Aparta al mes ' : 'Faltan '}
                  {remaining > 0 ? (
                    <Money value={monthlyNeeded !== null && (daysLeft ?? 0) > 0 ? monthlyNeeded : remaining} currency={goal.currency} variant="small" />
                  ) : null}
                </Text>
              </Card>
            </Pressable>
          ))}
          <Button variant="primary" title="Nueva meta" onPress={() => router.push('/meta')} />
        </>
      )}
      {goals.length ? (
        <Text variant="small" tone="faint">
          Toca una meta para abonar o editarla.
        </Text>
      ) : null}
    </Screen>
  );
}
