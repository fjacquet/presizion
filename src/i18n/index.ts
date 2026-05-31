import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_NS,
  FALLBACK_LNG,
  LANGUAGE_STORAGE_KEY,
  NAMESPACES,
  SUPPORTED_LANGUAGES,
} from './config';
// de
import deCommon from './locales/de/common.json';
import deExport from './locales/de/export.json';
import dePptx from './locales/de/pptx.json';
import deStep1 from './locales/de/step1.json';
import deStep2 from './locales/de/step2.json';
import deStep3 from './locales/de/step3.json';
import deWizard from './locales/de/wizard.json';
// en
import enCommon from './locales/en/common.json';
import enExport from './locales/en/export.json';
import enPptx from './locales/en/pptx.json';
import enStep1 from './locales/en/step1.json';
import enStep2 from './locales/en/step2.json';
import enStep3 from './locales/en/step3.json';
import enWizard from './locales/en/wizard.json';
// fr
import frCommon from './locales/fr/common.json';
import frExport from './locales/fr/export.json';
import frPptx from './locales/fr/pptx.json';
import frStep1 from './locales/fr/step1.json';
import frStep2 from './locales/fr/step2.json';
import frStep3 from './locales/fr/step3.json';
import frWizard from './locales/fr/wizard.json';

// it
import itCommon from './locales/it/common.json';
import itExport from './locales/it/export.json';
import itPptx from './locales/it/pptx.json';
import itStep1 from './locales/it/step1.json';
import itStep2 from './locales/it/step2.json';
import itStep3 from './locales/it/step3.json';
import itWizard from './locales/it/wizard.json';

export const resources = {
  en: {
    common: enCommon,
    wizard: enWizard,
    step1: enStep1,
    step2: enStep2,
    step3: enStep3,
    export: enExport,
    pptx: enPptx,
  },
  fr: {
    common: frCommon,
    wizard: frWizard,
    step1: frStep1,
    step2: frStep2,
    step3: frStep3,
    export: frExport,
    pptx: frPptx,
  },
  de: {
    common: deCommon,
    wizard: deWizard,
    step1: deStep1,
    step2: deStep2,
    step3: deStep3,
    export: deExport,
    pptx: dePptx,
  },
  it: {
    common: itCommon,
    wizard: itWizard,
    step1: itStep1,
    step2: itStep2,
    step3: itStep3,
    export: itExport,
    pptx: itPptx,
  },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: FALLBACK_LNG,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    ns: [...NAMESPACES],
    defaultNS: DEFAULT_NS,
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
