import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export const defaultLang = 'en';

export const supported = ['en', 'zh'] as const;
export type Lang = typeof supported[number];

export function useLang(): Lang {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const hlParam = searchParams?.get('hl');
    if (hlParam && supported.includes(hlParam as Lang)) {
      if (typeof window !== 'undefined') localStorage.setItem('lang', hlParam);
      return hlParam as Lang;
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lang');
      if (stored && supported.includes(stored as Lang)) return stored as Lang;
      
      const browserLang = navigator.language?.slice(0, 2);
      return supported.includes(browserLang as Lang) ? (browserLang as Lang) : defaultLang;
    }

    return defaultLang;
  }, [searchParams]);
}