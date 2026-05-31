import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { type AppLanguage, LANGUAGE_LABELS, SUPPORTED_LANGUAGES } from '@/i18n/config';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const current = (i18n.language?.split('-')[0] ?? 'en') as AppLanguage;

  function cycle() {
    const idx = SUPPORTED_LANGUAGES.indexOf(current);
    const next = SUPPORTED_LANGUAGES[(idx + 1) % SUPPORTED_LANGUAGES.length];
    void i18n.changeLanguage(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={t('language.switch', { lang: LANGUAGE_LABELS[current] })}
      title={LANGUAGE_LABELS[current]}
    >
      <Languages className="h-4 w-4" />
    </Button>
  );
}
