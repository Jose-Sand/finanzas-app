import { useMemo } from 'react';
import { Alert, Pressable, RefreshControl, View } from 'react-native';
import { Link, router } from 'expo-router';
import {
  api,
  budgetProgress,
  byCategory,
  dayLabel,
  friendlyError,
  monthKey,
  monthLabel,
  monthRange,
  shiftMonth,
  summarize,
  todayISO,
  toISODate,
  upcoming,
} from '@caudal/shared';
import { useFinance, useTransactions } from '@/lib/finance';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { BalanceBand, TxRow } from '@/components/finance-views';
import { Button, Card, Dot, Empty, Money, Progress, Screen, Text } from '@/components/ui';

export default function Resumen() {
  const { c } = useTheme();
  const { data, error, loading, refresh, accountsById, categoriesById } = useFinance();
  const today = todayISO();
  const month = monthKey(today);
  const { rows } = useTransactions({ from: monthRange(shiftMonth(month, -1)).start, to: monthRange(month).end });

  const monthTxs = useMemo(() => (rows ?? []).filter((t) => monthKey(t.occurred_on) === month), [rows, month]);

  if (!data) {
    return (
      <Screen>
        {error ? <Text tone="expense">{error}</Text> : <View style={{ height: 180, borderRadius: 24, backgroundColor: c.surfaceAlt }} />}
      </Screen>
    );
  }

  const base = data.profile.base_currency;
  const s = summarize(monthTxs, accountsById, base, data.rates);
  const slices = byCategory(monthTxs, 'expense', categoriesById, accountsById, base, data.rates).slice(0, 5);
  const budgets = budgetProgress(data.budgets, monthTxs, categoriesById, accountsById, data.rates, month, Number(today.slice(8, 10))).slice(0, 3);
  const in14 = new Date();
  in14.setDate(in14.getDate() + 14);
  const due = upcoming(data.recurring, toISODate(in14)).slice(0, 4);

  async function post(id: string) {
    try {
      await api.postRecurring(supabase, id);
      await refresh();
    } catch (e) {
      Alert.alert('No se pudo registrar', friendlyError(e));
    }
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading && Boolean(data)} onRefresh={refresh} tintColor={c.muted} />}>
      <BalanceBand />

      {rows && rows.length === 0 ? (
        <Empty
          title="Registra tu primer movimiento"
          body="Empieza con tu último ingreso o un gasto de hoy. Con unos pocos registros verás a dónde se va tu dinero."
          action={<Button variant="primary" title="Registrar movimiento" onPress={() => router.push('/movimiento')} />}
        />
      ) : null}

      <Card style={{ gap: 14 }}>
        <Text variant="title" style={{ textTransform: 'capitalize' }}>
          {monthLabel(month, true)}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text variant="small" tone="muted">
              Entró
            </Text>
            <Money value={s.income} currency={base} tone="income" variant="title" />
          </View>
          <View>
            <Text variant="small" tone="muted">
              Salió
            </Text>
            <Money value={s.expense} currency={base} variant="title" />
          </View>
          <View>
            <Text variant="small" tone="muted">
              Te quedó
            </Text>
            <Money value={s.net} currency={base} variant="title" tone={s.net < 0 ? 'expense' : 'ink'} />
          </View>
        </View>
        {s.savingsRate !== null ? (
          <Text variant="small" tone="muted">
            Ahorraste {Math.round(s.savingsRate * 100)}% de lo que entró
          </Text>
        ) : null}
      </Card>

      {slices.length ? (
        <Card style={{ gap: 14 }}>
          <Text variant="title">En qué se fue</Text>
          {slices.map((sl) => (
            <View key={sl.categoryId ?? 'none'} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Dot color={sl.color} />
                  <Text numberOfLines={1}>{sl.name}</Text>
                </View>
                <Money value={sl.total} currency={base} />
              </View>
              <Progress ratio={sl.share} color={sl.color} />
            </View>
          ))}
        </Card>
      ) : null}

      {budgets.length ? (
        <Card style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text variant="title">Presupuestos</Text>
            <Link href="/presupuestos">
              <Text variant="small" tone="muted">
                Ver todos
              </Text>
            </Link>
          </View>
          {budgets.map((b) => (
            <View key={b.budget.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text>{b.category?.name}</Text>
                <Text variant="small" tone="muted">
                  {Math.round(b.ratio * 100)}%
                </Text>
              </View>
              <Progress ratio={b.ratio} marker={b.pace} color={b.status === 'over' ? c.expense : b.status === 'warning' ? c.warning : c.income} />
            </View>
          ))}
        </Card>
      ) : null}

      {due.length ? (
        <Card style={{ gap: 4 }}>
          <Text variant="title" style={{ marginBottom: 6 }}>
            Próximos pagos
          </Text>
          {due.map((r) => {
            const acc = accountsById.get(r.account_id);
            const late = r.next_date < today;
            return (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="medium" numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text variant="small" tone={late ? 'expense' : 'muted'}>
                    {late ? 'Vencido · ' : ''}
                    {dayLabel(r.next_date)}
                    {acc ? ` · ${acc.name}` : ''}
                  </Text>
                </View>
                {acc ? <Money value={r.amount} currency={acc.currency} tone={r.kind === 'income' ? 'income' : 'ink'} /> : null}
                <Button small title="Registrar" onPress={() => post(r.id)} />
              </View>
            );
          })}
        </Card>
      ) : null}

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <Text variant="title">Últimos movimientos</Text>
          <Pressable onPress={() => router.navigate('/movimientos')}>
            <Text variant="small" tone="muted">
              Ver todos
            </Text>
          </Pressable>
        </View>
        {(rows ?? []).slice(0, 6).map((t) => (
          <TxRow key={t.id} tx={t} />
        ))}
        {rows && rows.length === 0 ? <Text tone="muted">Aún no hay movimientos.</Text> : null}
      </Card>
    </Screen>
  );
}
