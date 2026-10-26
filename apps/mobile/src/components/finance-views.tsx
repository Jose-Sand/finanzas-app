import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { crossRate, dayLabel, formatMoney, netWorth, type Currency, type Transaction } from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { band, fonts, useTheme } from '@/lib/theme';
import { Dot, Money, Text } from './ui';

function ago(iso: string | null): string {
  if (!iso) return 'sin datos';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `hace ${Math.max(1, mins)} min`;
  const h = Math.round(mins / 60);
  return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

export function BalanceBand() {
  const { data, accountsById } = useFinance();
  if (!data) return null;
  const base = data.profile.base_currency;
  const nw = netWorth(data.balances, accountsById, base, data.rates);
  const pools = (Object.entries(nw.byCurrency) as Array<[Currency, number]>).sort((a) => (a[0] === base ? -1 : 1));
  const foreign = pools.find(([cur]) => cur !== base)?.[0] ?? (base === 'COP' ? 'USD' : 'COP');
  const rate = crossRate(foreign, base, data.rates);

  return (
    <View style={{ backgroundColor: band.bg, borderRadius: 24, padding: 20, overflow: 'hidden' }}>
      <Svg width="100%" height={70} viewBox="0 0 400 70" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.6 }}>
        <Path d="M0 44 C 60 14, 110 66, 180 40 S 300 14, 400 42" fill="none" stroke={band.mango} strokeWidth={2} strokeDasharray="6 10" />
      </Svg>
      <Text variant="small" style={{ color: band.ink, opacity: 0.7 }}>
        Patrimonio neto en {base}
      </Text>
      <Text variant="hero" style={{ color: band.ink, marginTop: 4, fontVariant: ['tabular-nums'] }} adjustsFontSizeToFit numberOfLines={1}>
        {formatMoney(nw.total, base)}
      </Text>
      {nw.liabilities > 0 ? (
        <Text variant="small" style={{ color: band.ink, opacity: 0.7, marginTop: 4 }}>
          Tienes {formatMoney(nw.assets, base)} y debes {formatMoney(nw.liabilities, base)}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 18, marginBottom: 6 }}>
        {pools.length > 1
          ? pools.map(([cur, amt]) => (
              <Text key={cur} variant="small" style={{ color: band.ink }}>
                <Text variant="small" style={{ color: band.ink, opacity: 0.6 }}>
                  En {cur}{' '}
                </Text>
                {formatMoney(amt, cur)}
              </Text>
            ))
          : null}
      </View>
      {rate ? (
        <View style={{ marginTop: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: band.ink, fontFamily: fonts.display, fontSize: 16 }}>
            1 {foreign} = {formatMoney(rate, base, { plain: true })} {base}
          </Text>
          <Text variant="small" style={{ color: band.ink, opacity: 0.6, fontSize: 12 }}>
            Tasa actualizada {ago(data.ratesFetchedAt)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function TxRow({ tx, showDate = true }: { tx: Transaction; showDate?: boolean }) {
  const { c } = useTheme();
  const { accountsById, categoriesById } = useFinance();
  const account = accountsById.get(tx.account_id);
  if (!account) return null;
  const target = tx.transfer_account_id ? accountsById.get(tx.transfer_account_id) : undefined;
  const category = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
  const color = tx.kind === 'transfer' ? c.muted : category?.color ?? '#8A94A6';
  const title =
    tx.kind === 'transfer' ? `${account.name} → ${target?.name ?? 'Cuenta eliminada'}` : tx.note || category?.name || (tx.kind === 'income' ? 'Ingreso' : 'Gasto');
  const sub = tx.kind === 'transfer' ? tx.note || 'Transferencia' : [tx.note ? category?.name ?? 'Sin categoría' : null, account.name].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/movimiento', params: { id: tx.id } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}22` }}>
        <Dot color={color} size={11} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="medium" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" tone="muted" numberOfLines={1}>
          {showDate ? `${dayLabel(tx.occurred_on)} · ` : ''}
          {sub}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Money
          value={tx.kind === 'expense' ? -tx.amount : tx.amount}
          currency={account.currency}
          signed={tx.kind !== 'transfer'}
          tone={tx.kind === 'income' ? 'income' : 'ink'}
        />
        {tx.kind === 'transfer' && target && target.currency !== account.currency && tx.transfer_amount ? (
          <Money value={tx.transfer_amount} currency={target.currency} tone="muted" variant="small" />
        ) : null}
      </View>
    </Pressable>
  );
}
