import type { Lang } from "./useLang";

// Better type: nested dictionary of strings
export type Dictionary = Record<string, unknown>;

// In-memory cache (per session)
const dictionaryCache = new Map<string, Dictionary>();

// 3 days TTL
const TTL = 3 * 24 * 60 * 60 * 1000;

type CachedEntry = {
  data: Dictionary;
  timestamp: number;
};

// --- Persistent cache helpers ---
function getFromStorage(key: string): Dictionary | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed: CachedEntry = JSON.parse(raw);

    const isExpired = Date.now() - parsed.timestamp > TTL;
    if (isExpired) {
      localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, data: Dictionary) {
  try {
    const entry: CachedEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn("Failed to save dictionary cache:", e);
  }
}

// --- Main function ---
export async function getDictionary(
  lang: Lang,
  page: string = "common",
): Promise<Dictionary> {
  const cacheKey = `${lang}:${page}`;
  console.log(`Loading dictionary for lang="${lang}", page="${page}"`);

  // 1. In-memory cache (fastest)
  if (dictionaryCache.has(cacheKey)) {
    return dictionaryCache.get(cacheKey)!;
  }

  // 2. localStorage cache (with TTL)
  const stored = getFromStorage(cacheKey);
  if (stored) {
    dictionaryCache.set(cacheKey, stored);
    return stored;
  }

  // 3. Fetch from public folder (works with static export)
  let dictionary: Dictionary = {};

  try {
    const [commonRes, pageRes] = await Promise.allSettled([
      fetch(`/locales/common/${lang}.json`).then((r) => r.json()),
      page !== "common"
        ? fetch(`/locales/${page}/${lang}.json`).then((r) => r.json())
        : Promise.resolve({}),
    ]);

    const common =
      commonRes.status === "fulfilled" ? commonRes.value : {};

    const pageDict =
      pageRes.status === "fulfilled" ? pageRes.value : {};

    dictionary = {
      common,
      [page]: pageDict,
    };
  } catch (error) {
    console.error("Failed to load dictionary:", error);
  }

  // 4. Save to both caches
  dictionaryCache.set(cacheKey, dictionary);
  saveToStorage(cacheKey, dictionary);

  console.log(`Loaded and cached key="${cacheKey}"`);
  return dictionary;
}
