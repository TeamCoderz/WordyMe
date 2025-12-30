import z from 'zod';

export const imageMetaSchema = z
  .object({
    width: z.coerce.number(),
    height: z.coerce.number(),
    x: z.coerce.number(),
    y: z.coerce.number(),
    zoom: z.coerce.number(),
  })
  .partial();
export type ImageMeta = z.output<typeof imageMetaSchema>;
