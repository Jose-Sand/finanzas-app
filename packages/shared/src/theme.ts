/**
 * Caudal design tokens, shared by web (CSS variables) and mobile (StyleSheet).
 * Palette: night-blue ink on cool paper, mango for the one thing that matters
 * on each screen, and plain green/red for money in and out.
 */
export const palette = {
  light: {
    bg: '#F3F5F9',
    surface: '#FFFFFF',
    surfaceAlt: '#E9EDF4',
    line: '#DCE1EA',
    ink: '#1C2541',
    muted: '#5D6B82',
    faint: '#8E99AD',
    mango: '#F2A541',
    mangoInk: '#3A2606',
    income: '#23794C',
    expense: '#B83A31',
    warning: '#B76E00',
    focus: '#3554E0',
  },
  dark: {
    bg: '#0F1528',
    surface: '#171F38',
    surfaceAlt: '#1F2947',
    line: '#2A355A',
    ink: '#E8ECF5',
    muted: '#9BA7C2',
    faint: '#6D7A98',
    mango: '#F5B45A',
    mangoInk: '#2B1C04',
    income: '#5CC28A',
    expense: '#F07A70',
    warning: '#F0B04A',
    focus: '#8FA5FF',
  },
} as const;

export type ThemeName = keyof typeof palette;
export type ThemeColors = { [K in keyof (typeof palette)['light']]: string };

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/** Category swatches offered in pickers. */
export const SWATCHES = [
  '#23794C', '#3C9D8F', '#1F8AC0', '#3D5AFE', '#6C5CE7', '#8E5BD9',
  '#D6457A', '#C8463D', '#D9653B', '#E08A2E', '#F2A541', '#5E6A7D',
] as const;
