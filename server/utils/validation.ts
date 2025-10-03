import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

export interface ValidationResult<T = any> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
}

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const validationError = fromZodError(result.error);
    return {
      ok: false,
      code: 'VALIDATION_FAILED',
      message: validationError.message,
    };
  }
  
  return {
    ok: true,
    data: result.data,
  };
}

export const schemas = {
  leagueId: z.string().uuid(),
  discordId: z.string().min(1),
  channelId: z.string().min(1),
  guildId: z.string().min(1),
  email: z.string().email(),
  timezone: z.string().min(1),
};
