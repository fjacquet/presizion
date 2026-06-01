import { beforeEach, describe, expect, it } from 'vitest';

import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from '../config';
import i18n from '../index';

// i18next is initialized globally in src/test-setup.ts (which also forces 'en'
// before each test). jsdom provides a working localStorage, so the
// LanguageDetector's `caches: ['localStorage']` persists real values here.

describe('locale smoke', () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('all supported languages resolve common:appTagline to a non-empty string', async () => {
    for (const lng of SUPPORTED_LANGUAGES) {
      await i18n.changeLanguage(lng);
      const value = i18n.t('common:appTagline');
      expect(value).toBeTruthy();
      expect(value).not.toBe('common:appTagline'); // no missing-key fallthrough
    }
  });

  it('changeLanguage persists the selection to localStorage', async () => {
    await i18n.changeLanguage('fr');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
  });
});
