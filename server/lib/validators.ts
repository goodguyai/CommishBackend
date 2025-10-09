import { z } from 'zod';

/**
 * Discord Snowflake Validator
 * Ensures Discord IDs (guild, channel, user) are valid snowflakes
 * A snowflake is a string of 17-19 digits
 */
export const discordSnowflake = z.string().refine(
  (val) => /^\d{17,19}$/.test(val),
  {
    message: "Discord ID must be a valid snowflake (17-19 digit string)",
  }
);

/**
 * Error response for invalid snowflakes
 */
export function invalidSnowflakeError(field: string = "Discord ID") {
  return {
    ok: false,
    code: "INVALID_SNOWFLAKE",
    message: `${field} must be a string snowflake`,
  };
}
