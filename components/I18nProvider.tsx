'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translate, type Language, type TranslationKey } from '@/lib/i18n';

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ko');

  useEffect(() => {
    const saved = window.localStorage.getItem('agentalpha_language');
    if (saved === 'ko' || saved === 'en') setLanguageState(saved);
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem('agentalpha_language', next);
    document.documentElement.lang = next;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    setLanguage,
    toggleLanguage: () => setLanguage(language === 'ko' ? 'en' : 'ko'),
    t: (key) => translate(language, key),
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
