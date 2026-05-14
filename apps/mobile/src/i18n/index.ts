import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.js';
import vi from './vi.js';

const fallback = 'vi';
const detected = getLocales()[0]?.languageCode ?? fallback;

void i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi }, en: { translation: en } },
  lng: detected === 'en' ? 'en' : 'vi',
  fallbackLng: fallback,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
