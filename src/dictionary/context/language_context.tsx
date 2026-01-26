import { isLanguage } from "@/dictionary/types/general";
import { getClientCookie, setClientCookie } from "@/utils/cookies_helper";
import { Language } from "@prisma/client";
import { ReactNode, createContext, useContext, useState } from "react";

interface LanguageContextProps {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(
  undefined,
);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

function getBrowserLocale(): Language {
  if (typeof window !== "undefined") {
    const cookieLang = getClientCookie("lang");
    if (cookieLang && isLanguage(cookieLang)) {
      return cookieLang;
    }

    if (isLanguage(navigator.language)) {
      return navigator.language;
    }
  }

  return "es";
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguageState] = useState<Language>(() =>
    getBrowserLocale(),
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: (lang) => {
          setClientCookie("lang", lang);
          setLanguageState(lang);
        },
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
