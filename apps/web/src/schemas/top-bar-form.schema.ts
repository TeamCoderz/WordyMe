import { TOP_BAR_THEMES } from '@repo/ui/theme/themes';
import { z } from 'zod';

const themeValues = TOP_BAR_THEMES.map((theme) => theme.value) as [string, ...string[]];

const baseFields = {
  instance_name: z
    .string()
    .trim()
    .min(1, 'Instance Name must be at least 1 character long.')
    .max(25, 'Instance Name must be at most 25 characters long.'),
  instance_logo: z.string().min(1, 'Logo is required.'),
};
const noGradientSchema = z.object({
  ...baseFields,
  top_bar_gradient: z.literal(false),
  top_bar_theme_color: z.enum(themeValues, {
    message: 'Top Bar Theme is required.',
  }),
});

const gradientSchema = z.object({
  ...baseFields,
  top_bar_gradient: z.literal(true),
  top_bar_start_color: z.enum(themeValues, {
    message: 'Start Color is required.',
  }),
  top_bar_end_color: z.enum(themeValues, { message: 'End Color is required.' }),
  top_bar_gradient_direction: z.enum(['right', 'bottom', 'left', 'top'] as const, {
    message: 'Gradient Direction is required.',
  }),
});

export const topBarFormSchema = z.discriminatedUnion('top_bar_gradient', [
  noGradientSchema,
  gradientSchema,
]);
export type TopBarFormValues = z.infer<typeof topBarFormSchema>;
