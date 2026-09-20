
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { translations, Language } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['en'], params?: Record<string, any>) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const savedLang = localStorage.getItem('app_language');
      return (savedLang as Language) || 'fr';
    } catch (e) {
      return 'fr';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('app_language', lang);
    } catch (e) {
      console.error('Failed to save language to localStorage', e);
    }
  };

  useEffect(() => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: keyof typeof translations['en'], params?: Record<string, any>) => {
    const translationSet = translations[language] || translations['fr'];
    let translation = (translationSet as any)[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        translation = translation.replace(`{${k}}`, String(v));
      });
    }
    
    return translation;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
