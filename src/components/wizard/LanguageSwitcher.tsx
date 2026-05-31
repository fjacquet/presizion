import { useTranslation } from 'react-i18next';
import { type AppLanguage, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '@/i18n/config';

const selectClasses =
  'h-9 w-auto rounded-md border border-slate-300 dark:border-surface-700 bg-transparent px-2 py-1 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-500/50 cursor-pointer';

/**
 * Language selector for the wizard header. Lists all supported languages by
 * their native label and switches on change (persisted via the i18next
 * LanguageDetector localStorage cache).
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const current = (i18n.language?.split('-')[0] ?? 'en') as AppLanguage;

  return (
    <select
      className={selectClasses}
      aria-label={t('language.select')}
      value={current}
      onChange={(e) => void i18n.changeLanguage(e.target.value)}
    >
      {SUPPORTED_LANGUAGES.map((lng) => (
        <option key={lng} value={lng}>
          {LANGUAGE_LABELS[lng]}
        </option>
      ))}
    </select>
  );
}
