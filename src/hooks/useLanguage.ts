import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

type Lang = 'en' | 'ar';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: Lang) => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return {
    currentLang: i18n.language as Lang,
    changeLanguage,
    isRTL: i18n.language === 'ar',
  };
};