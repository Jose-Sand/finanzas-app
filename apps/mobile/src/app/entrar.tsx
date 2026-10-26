import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { friendlyError } from '@caudal/shared';
import { supabase } from '@/lib/supabase';
import { band, useTheme } from '@/lib/theme';
import { Button, Field, Input, Segmented, Text } from '@/components/ui';

type Mode = 'signin' | 'signup';

export default function Entrar() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Escribe un correo válido.');
    if (password.length < (mode === 'signup' ? 8 : 1))
      return setError(mode === 'signup' ? 'La contraseña debe tener al menos 8 caracteres.' : 'Escribe tu contraseña.');
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() || undefined } },
        });
        if (error) throw error;
        if (!data.session) setNotice(`Te enviamos un enlace a ${email.trim()}. Ábrelo y vuelve a entrar aquí.`);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Escribe tu correo para enviarte el enlace.');
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setBusy(false);
    if (error) setError(friendlyError(error));
    else setNotice(`Si ${email.trim()} tiene cuenta, te llegará un enlace para crear una contraseña nueva.`);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: band.bg, paddingTop: insets.top + 32, paddingHorizontal: 24, paddingBottom: 36, gap: 18 }}>
          <Svg width={44} height={44} viewBox="0 0 64 64">
            <Rect width={64} height={64} rx={16} fill="#24305A" />
            <Path d="M10 38c8-10 14-10 22 0s14 10 22 0" fill="none" stroke={band.mango} strokeWidth={6} strokeLinecap="round" />
            <Path d="M10 24c8-10 14-10 22 0s14 10 22 0" fill="none" stroke={band.ink} strokeWidth={6} strokeLinecap="round" opacity={0.55} />
          </Svg>
          <Text variant="hero" style={{ color: band.ink }}>
            Ganas en dólares.{'\n'}Gastas en pesos.{'\n'}
            <Text variant="hero" style={{ color: '#9BA7C2' }}>
              Sabes cuánto tienes.
            </Text>
          </Text>
        </View>

        <View style={{ padding: 24, gap: 18 }}>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
              setNotice(null);
            }}
            options={[
              { value: 'signin', label: 'Entrar' },
              { value: 'signup', label: 'Crear cuenta' },
            ]}
          />
          {mode === 'signup' ? (
            <Field label="Nombre">
              <Input value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
            </Field>
          ) : null}
          <Field label="Correo">
            <Input
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </Field>
          <Field label="Contraseña" hint={mode === 'signup' ? 'Mínimo 8 caracteres.' : undefined}>
            <Input
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              onSubmitEditing={submit}
            />
          </Field>
          {error ? (
            <Text tone="expense" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          {notice ? <Text tone="income">{notice}</Text> : null}
          <Button variant="primary" title={mode === 'signin' ? 'Entrar' : 'Crear cuenta'} onPress={submit} loading={busy} />
          {mode === 'signin' ? <Button variant="ghost" title="Olvidé mi contraseña" onPress={reset} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
