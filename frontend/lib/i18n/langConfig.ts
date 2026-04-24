import type { Lang } from "./useLang";

export interface LangConfig {
  label: string;
  nativeName: string;
}

export const langConfigs: Record<Lang, LangConfig> = {
  en: { label: "English", nativeName: "English" },
  zh: { label: "Chinese", nativeName: "中文" },
};

export function getLangConfigs(): LangConfig[] {
  return Object.values(langConfigs);
}
