import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

export type SupportedLanguage = 'en' | 'es';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'es'];

const detectSystemLanguage = (): SupportedLanguage => {
  const lang = (navigator.language || 'en').toLowerCase();
  return lang.startsWith('es') ? 'es' : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: detectSystemLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export const setLanguage = async (lang: SupportedLanguage): Promise<void> => {
  await i18n.changeLanguage(lang);
};

export default i18n;
