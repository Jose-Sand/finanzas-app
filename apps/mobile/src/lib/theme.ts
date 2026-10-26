import { useColorScheme } from 'react-native';
import { palette, radius, space, type ThemeColors } from '@caudal/shared';

export const fonts = {
  display: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
} as const;

export interface Theme {
  dark: boolean;
  c: ThemeColors;
  radius: typeof radius;
  space: typeof space;
}

export function useTheme(): Theme {
  const dark = useColorScheme() === 'dark';
  return { dark, c: dark ? palette.dark : palette.light, radius, space };
}

/** The balance band and landing card stay night-blue in both themes. */
export const band = { bg: '#1C2541', ink: '#F3F5F9', mango: '#F5B45A' } as const;
