export type FontSize = 'small' | 'medium' | 'large';

// Multiplier applied to all font sizes in templates
export const FONT_MULT: Record<FontSize, number> = {
  small: 1.0,
  medium: 1.15,
  large: 1.32,
};
