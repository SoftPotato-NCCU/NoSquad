import { useState, useEffect } from 'react';
import { useLang } from './useLang';
import { getDictionary, type Dictionary } from './getDictionary';

export function useDictionary(page: string = 'common') {
  const lang = useLang();
  const [dict, setDict] = useState<Dictionary>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    getDictionary(lang, page).then((data) => {
      if (isMounted) {
        setDict(data);
        setIsLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [lang, page]);

  return { lang, dict, isLoading };
}

export function t(dict: Dictionary | null | undefined, path: string, fallback: string = ''): string {
  if (!dict) return fallback;

  const keys = path.split('.');
  let value: unknown = dict;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return fallback;
    }
  }

  return typeof value === 'string' ? value : fallback;
}
