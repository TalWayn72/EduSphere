import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from 'i18next';
import { RTL_LOCALES, type SupportedLocale } from '@edusphere/i18n';

interface DirectionContextValue {
  direction: 'ltr' | 'rtl';
  isRtl: boolean;
}

const DirectionContext = createContext<DirectionContextValue>({
  direction: 'ltr',
  isRtl: false,
});

function getDirection(lang: string): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(lang as SupportedLocale) ? 'rtl' : 'ltr';
}

export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(() =>
    getDirection(i18n.language ?? 'en'),
  );

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setDirection(getDirection(lng));
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const value: DirectionContextValue = {
    direction,
    isRtl: direction === 'rtl',
  };

  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
}

export function useDirection(): DirectionContextValue {
  return useContext(DirectionContext);
}
