import { type AppLanguage, FALLBACK_LNG, LOCALE_MAP } from './config';
import i18n from './index';

function activeLocale(): string {
  const lng = (i18n.language?.split('-')[0] ?? FALLBACK_LNG) as AppLanguage;
  return LOCALE_MAP[lng] ?? LOCALE_MAP[FALLBACK_LNG];
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(activeLocale(), options).format(value);
}

export function formatInt(value: number): string {
  return formatNumber(value, { maximumFractionDigits: 0 });
}
