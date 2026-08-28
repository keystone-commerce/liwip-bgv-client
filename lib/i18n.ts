const english = {
  "home.worker": "I am a worker",
  "home.organisation": "I am an organisation",
  "home.available": "Available",
  "home.soon": "Soon",
  "home.continue": "Continue where you left off"
} as const;

export type TranslationKey = keyof typeof english;

export function t(key: TranslationKey): string {
  return english[key];
}
