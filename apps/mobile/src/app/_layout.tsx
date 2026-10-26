import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
// Deep imports keep unused weights out of the bundle.
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { IBMPlexSans_400Regular } from '@expo-google-fonts/ibm-plex-sans/400Regular';
import { IBMPlexSans_500Medium } from '@expo-google-fonts/ibm-plex-sans/500Medium';
import { IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans/600SemiBold';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { FinanceProvider } from '@/lib/finance';
import { fonts, useTheme } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { c, dark } = useTheme();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [loaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    IBMPlexSans_400Regular,
    IBMPlexSans_500Medium,
    IBMPlexSans_600SemiBold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const ready = loaded && session !== undefined;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  const signedIn = Boolean(session);
  const header = {
    headerStyle: { backgroundColor: c.bg },
    headerTintColor: c.ink,
    headerTitleStyle: { fontFamily: fonts.display },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: c.bg },
    headerBackButtonDisplayMode: 'minimal' as const,
  };

  const stack = (
    <Stack screenOptions={header}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="movimiento" options={{ presentation: 'modal', title: 'Movimiento' }} />
        <Stack.Screen name="cuentas" options={{ title: 'Cuentas' }} />
        <Stack.Screen name="cuenta" options={{ presentation: 'modal', title: 'Cuenta' }} />
        <Stack.Screen name="metas" options={{ title: 'Metas' }} />
        <Stack.Screen name="meta" options={{ presentation: 'modal', title: 'Meta' }} />
        <Stack.Screen name="recurrentes" options={{ title: 'Recurrentes' }} />
        <Stack.Screen name="presupuesto" options={{ presentation: 'modal', title: 'Presupuesto' }} />
        <Stack.Screen name="recurrente" options={{ presentation: 'modal', title: 'Pago recurrente' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="entrar" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {signedIn ? <FinanceProvider key={session!.user.id}>{stack}</FinanceProvider> : stack}
    </>
  );
}
