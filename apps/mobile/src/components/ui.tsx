import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { formatMoney, type Currency } from '@caudal/shared';
import { fonts, useTheme } from '@/lib/theme';

type Tone = 'ink' | 'muted' | 'faint' | 'income' | 'expense' | 'warning';

export function Text({
  style,
  tone = 'ink',
  variant = 'body',
  ...rest
}: TextProps & { tone?: Tone; variant?: 'body' | 'medium' | 'semibold' | 'display' | 'title' | 'hero' | 'small' }) {
  const { c } = useTheme();
  const v: Record<string, TextStyle> = {
    body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
    medium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
    semibold: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
    small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
    title: { fontFamily: fonts.display, fontSize: 19, lineHeight: 24 },
    display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.4 },
    hero: { fontFamily: fonts.displayBold, fontSize: 38, lineHeight: 42, letterSpacing: -0.8 },
  };
  return <RNText style={[v[variant], { color: c[tone] }, style]} {...rest} />;
}

export function Money({
  value,
  currency,
  signed,
  tone,
  variant = 'medium',
  style,
}: {
  value: number;
  currency: Currency;
  signed?: boolean;
  tone?: Tone;
  variant?: Parameters<typeof Text>[0]['variant'];
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text variant={variant} tone={tone} style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {formatMoney(value, currency, { signed })}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = 'secondary',
  loading,
  disabled,
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = variant === 'primary' ? c.mango : variant === 'secondary' || variant === 'danger' ? c.surface : 'transparent';
  const fg = variant === 'primary' ? c.mangoInk : variant === 'danger' ? c.expense : variant === 'ghost' ? c.muted : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: small ? 36 : 48,
          paddingHorizontal: small ? 14 : 18,
          borderRadius: 12,
          backgroundColor: bg,
          borderWidth: variant === 'secondary' || variant === 'danger' ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: c.line,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : null}
      <Text variant="medium" style={{ color: fg, fontSize: small ? 14 : 16 }}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: c.line, padding: 16 }, style]}>
      {children}
    </View>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="medium" tone="muted" style={{ fontSize: 14 }}>
        {label}
      </Text>
      {children}
      {error ? (
        <Text variant="small" tone="expense" accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="small" tone="faint">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Input({ style, large, ...rest }: TextInputProps & { large?: boolean }) {
  const { c } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.faint}
      style={[
        {
          height: large ? 60 : 48,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: c.line,
          backgroundColor: c.surface,
          paddingHorizontal: 14,
          color: c.ink,
          fontFamily: large ? fonts.display : fonts.body,
          fontSize: large ? 28 : 16,
        },
        style,
      ]}
      {...rest}
    />
  );
}

/** Horizontal, scrollable single-choice pills. */
export function Chips<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; color?: string }>;
}) {
  const { c } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              height: 40,
              paddingHorizontal: 14,
              borderRadius: 999,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderColor: on ? c.ink : c.line,
              backgroundColor: on ? c.ink : c.surface,
            }}
          >
            {o.color ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: o.color }} /> : null}
            <Text variant="medium" style={{ color: on ? c.bg : c.ink, fontSize: 14 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string }> }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 4, gap: 4 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent' }}
          >
            <Text variant="medium" tone={on ? 'ink' : 'muted'} style={{ fontSize: 14 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Progress({ ratio, color, marker }: { ratio: number; color: string; marker?: number }) {
  const { c } = useTheme();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: c.surfaceAlt }}>
      <View style={{ height: 8, borderRadius: 4, width: `${Math.min(100, Math.max(0, ratio * 100))}%`, backgroundColor: color }} />
      {marker !== undefined ? (
        <View style={{ position: 'absolute', top: -4, width: 2, height: 16, borderRadius: 1, backgroundColor: c.muted, left: `${Math.min(100, marker * 100)}%` }} />
      ) : null}
    </View>
  );
}

export function Dot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function Screen({ children, refreshControl }: { children: ReactNode; refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'] }) {
  const { c } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.line, borderRadius: 18, padding: 20, gap: 10 }}>
      <Text variant="title">{title}</Text>
      <Text tone="muted">{body}</Text>
      {action}
    </View>
  );
}
