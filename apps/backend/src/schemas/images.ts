/**
 * SPDX-FileCopyrightText: 2026 TeamCoderz Ltd <legal@teamcoderz.org>
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

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
