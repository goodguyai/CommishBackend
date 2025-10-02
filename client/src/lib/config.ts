export const FEATURES = {
  MOCK_MODE: true,
  ENABLE_PERSONAS: true,
  ENABLE_CHAT: true,
  ENABLE_TERMINAL: true,
  ENABLE_POWERS: true,
} as const;

export type Feature = keyof typeof FEATURES;
