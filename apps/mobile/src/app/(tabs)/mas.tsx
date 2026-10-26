import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight, Goal, Repeat, Wallet } from 'lucide-react-native';
import { api, CURRENCIES, friendlyError, type Currency } from '@caudal/shared';
import { useFinance } from '@/lib/finance';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { Button, Card, Chips, Field, Input, Screen, Text } from '@/components/ui';

export default function Mas() {
  const { c } = useTheme();
  const { data, refresh } = useFinance();
  const [name, setName] = useState(data?.profile.full_name ?? '');
  const [busy, setBusy] = useState(false);

  const links: Array<{ href: Href; label: string; detail: string; icon: React.ReactNode }> = [
    { href: '/cuentas', label: 'Cuentas', detail: `${data?.accounts.filter((a) => !a.archived).length ?? 0} activas`, icon: <Wallet color={c.ink} size={20} /> },
    { href: '/metas', label: 'Metas', detail: `${data?.goals.filter((g) => !g.archived).length ?? 0} en curso`, icon: <Goal color={c.ink} size={20} /> },
    { href: '/recurrentes', label: 'Recurrentes', detail: `${data?.recurring.filter((r) => r.active).length ?? 0} activos`, icon: <Repeat color={c.ink} size={20} /> },
  ];

  async function setBase(cur: Currency) {
    if (!data) return;
    try {
      await api.updateProfile(supabase, data.profile.id, { base_currency: cur });
      await refresh();
    } catch (e) {
      Alert.alert('No se pudo guardar', friendlyError(e));
    }
  }

  async function saveName() {
    if (!data) return;
    setBusy(true);
    try {
      await api.updateProfile(supabase, data.profile.id, { full_name: name.trim() || null });
      await refresh();
    } catch (e) {
      Alert.alert('No se pudo guardar', friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Card style={{ padding: 0 }}>
        {links.map((l, i) => (
          <Pressable
            key={l.label}
            onPress={() => router.push(l.href)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingHorizontal: 16,
              paddingVertical: 16,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: c.line,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            {l.icon}
            <View style={{ flex: 1 }}>
              <Text variant="medium">{l.label}</Text>
              <Text variant="small" tone="muted">
                {l.detail}
              </Text>
            </View>
            <ChevronRight color={c.faint} size={18} />
          </Pressable>
        ))}
      </Card>

      <Card style={{ gap: 14 }}>
        <Text variant="title">Perfil</Text>
        <Field label="Nombre">
          <Input value={name} onChangeText={setName} onEndEditing={saveName} returnKeyType="done" />
        </Field>
        <Field label="Moneda principal" hint="Los totales se muestran en esta moneda.">
          <Chips value={data?.profile.base_currency ?? 'COP'} onChange={setBase} options={CURRENCIES.map((cur) => ({ value: cur, label: cur }))} />
        </Field>
        {busy ? <Text variant="small" tone="muted">Guardando…</Text> : null}
      </Card>

      <Button
        variant="ghost"
        title="Salir de Caudal"
        onPress={() =>
          Alert.alert('Salir', '¿Quieres cerrar sesión en este dispositivo?', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Salir', style: 'destructive', onPress: () => void supabase.auth.signOut() },
          ])
        }
      />
    </Screen>
  );
}
