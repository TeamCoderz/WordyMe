import { z } from 'zod';

export { HttpException } from '@httpx/exception';

export const errorSchema = z.object({
  statusCode: z.number(),
  name: z.string(),
  message: z.string().optional(),
  issues: z.array(z.unknown()).optional(),
  cause: z.unknown().optional(),
});

export type ErrorSchema = z.infer<typeof errorSchema>;
