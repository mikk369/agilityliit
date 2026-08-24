"use client";

import { useTranslation, type Locale } from "@/i18n/LanguageContext";

export default function LangToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs font-medium">
      {(["ET", "EN"] as const).map((lang) => {
        const l = lang.toLowerCase() as Locale;
        const isActive = locale === l;
        return (
          <button
            key={lang}
            onClick={() => setLocale(l)}
            className={`px-2 py-1 rounded-md transition-colors ${
              isActive
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {lang}
          </button>
        );
      })}
    </div>
  );
}
