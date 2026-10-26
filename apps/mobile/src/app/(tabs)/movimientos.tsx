import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, SectionList, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { dayLabel, monthKey, monthLabel, monthRange, shiftMonth, summarize, todayISO, type Transaction, type TransactionKind } from '@caudal/shared';
import { useFinance, useTransactions } from '@/lib/finance';
import { useTheme } from '@/lib/theme';
import { TxRow } from '@/components/finance-views';
import { Chips, Input, Money, Text } from '@/components/ui';

export default function Movimientos() {
  const { c } = useTheme();
  const { data, accountsById, categoriesById, refresh, loading } = useFinance();
  const current = monthKey(todayISO());
  const [month, setMonth] = useState(current);
  const [kind, setKind] = useState<TransactionKind | 'all'>('all');
  const [search, setSearch] = useState('');
  const range = monthRange(month);
  const { rows, error } = useTransactions({ from: range.start, to: range.end, kind: kind === 'all' ? undefined : kind });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!rows) return [];
    if (!q) return rows;
    return rows.filter((t) =>
      `${t.note ?? ''} ${t.category_id ? categoriesById.get(t.category_id)?.name ?? '' : ''} ${accountsById.get(t.account_id)?.name ?? ''}`
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search, categoriesById, accountsById]);

  const sections = useMemo(() => {
    const m = new Map<string, Transaction[]>();
    for (const t of filtered) m.set(t.occurred_on, [...(m.get(t.occurred_on) ?? []), t]);
    return [...m.entries()].map(([date, items]) => ({ title: dayLabel(date), data: items }));
  }, [filtered]);

  const base = data?.profile.base_currency ?? 'COP';
  const totals = data ? summarize(filtered, accountsById, base, data.rates) : null;

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      sections={sections}
      keyExtractor={(t) => t.id}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={loading && Boolean(data)} onRefresh={refresh} tintColor={c.muted} />}
      ListHeaderComponent={
        <View style={{ gap: 12, paddingTop: 8, paddingBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={12} accessibilityLabel="Mes anterior">
              <ChevronLeft color={c.muted} />
            </Pressable>
            <Text variant="title" style={{ textTransform: 'capitalize' }}>
              {monthLabel(month, true)}
            </Text>
            <Pressable
              onPress={() => setMonth(shiftMonth(month, 1))}
              disabled={month >= current}
              hitSlop={12}
              accessibilityLabel="Mes siguiente"
              style={{ opacity: month >= current ? 0.3 : 1 }}
            >
              <ChevronRight color={c.muted} />
            </Pressable>
          </View>
          <Input placeholder="Buscar por nota, categoría o cuenta" value={search} onChangeText={setSearch} />
          <Chips
            value={kind}
            onChange={setKind}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'expense', label: 'Gastos' },
              { value: 'income', label: 'Ingresos' },
              { value: 'transfer', label: 'Transferencias' },
            ]}
          />
          {totals && filtered.length ? (
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <Text variant="small" tone="muted">
                Ingresos <Money value={totals.income} currency={base} tone="income" variant="small" />
              </Text>
              <Text variant="small" tone="muted">
                Gastos <Money value={totals.expense} currency={base} variant="small" />
              </Text>
            </View>
          ) : null}
          {error ? <Text tone="expense">{error}</Text> : null}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text variant="medium" tone="muted" style={{ marginTop: 14, fontSize: 13 }}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => <TxRow tx={item} showDate={false} />}
      ListEmptyComponent={
        rows ? (
          <Text tone="muted" style={{ marginTop: 24 }}>
            {search || kind !== 'all' ? 'Nada coincide con esos filtros.' : `Sin movimientos en ${monthLabel(month, true)}.`}
          </Text>
        ) : undefined
      }
    />
  );
}
