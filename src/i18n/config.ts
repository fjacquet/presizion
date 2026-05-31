// src/i18n/config.ts
export const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const NAMESPACES = [
  'common',
  'wizard',
  'step1',
  'step2',
  'step3',
  'export',
  'pptx',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_NS: Namespace = 'common';
export const FALLBACK_LNG: AppLanguage = 'en';

export const LANGUAGE_STORAGE_KEY = 'presizion-lang';

/** App language → BCP-47 locale for Intl formatting (Swiss market). */
export const LOCALE_MAP: Record<AppLanguage, string> = {
  en: 'en-CH',
  fr: 'fr-CH',
  de: 'de-CH',
  it: 'it-CH',
};

/** Native labels for the language switcher. */
export const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};
