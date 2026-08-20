// js/api.js

import { searchTMDB, getTMDBDetails } from './tmdb.js';
import { searchShikimori, getShikimoriDetails } from './shikimori.js';
import { searchRAWG, getRAWGDetails } from './rawg.js';

const DETAIL_FETCHERS = {
  tmdb: (item) => getTMDBDetails(item.providerId, item.type),
  shikimori: (item) => getShikimoriDetails(item.providerId),
  rawg: (item) => getRAWGDetails(item.providerId),
};

export async function enrichDetails(item) {
  const fetchDetails = DETAIL_FETCHERS[item.provider];

  if (!fetchDetails) return item;

  try {
    const extra = await fetchDetails(item);

    return extra
      ? { ...item, ...extra }
      : item;

  } catch (err) {
    console.warn('[api] detail enrichment failed', err);
    return item;
  }
}

function dedupe(items) {
  const seen = new Set();

  return items.filter((item) => {
    const key = `${item.provider}:${item.providerId}`;

    if (seen.has(key)) return false;

    seen.add(key);

    return true;
  });
}

function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}


function removeAnimeDuplicates(items) {
  const animeTitles = new Set(
    items
      .filter((item) => item.type === 'anime')
      .flatMap((item) => [
        item.title,
        item.originalTitle,
      ])
      .map(normalizeTitle)
      .filter(Boolean)
  );

  if (!animeTitles.size) {
    return items;
  }

  return items.filter((item) => {
    if (
      item.provider === 'tmdb' &&
      item.type === 'series'
    ) {
      const title =
        normalizeTitle(item.title);

      const originalTitle =
        normalizeTitle(item.originalTitle);

      if (
        animeTitles.has(title) ||
        animeTitles.has(originalTitle)
      ) {
        return false;
      }
    }

    return true;
  });
}

export async function searchAll(query, activeTypes = new Set()) {
  const trimmed = query.trim();

  if (!trimmed) return [];

  const searches = [];

  const searchAllProviders = activeTypes.size === 0;

  const needMovies =
    searchAllProviders || activeTypes.has('movie');

  const needSeries =
    searchAllProviders || activeTypes.has('series');

  const needAnime =
    searchAllProviders || activeTypes.has('anime');

  const needGames =
    searchAllProviders || activeTypes.has('game');

  if (needMovies || needSeries) {
    searches.push(async () => {
      let results = await searchTMDB(trimmed);

      if (needMovies && !needSeries) {
        results = results.filter((x) => x.type === 'movie');
      }

      if (needSeries && !needMovies) {
        results = results.filter((x) => x.type === 'series');
      }

      return results;
    });
  }

  if (needAnime) {
    searches.push(() => searchShikimori(trimmed));
  }

  if (needGames) {
    searches.push(() => searchRAWG(trimmed));
  }

  const settled = await Promise.allSettled(
    searches.map((fn) => fn())
  );

  const combined = settled
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value);

return removeAnimeDuplicates(
  dedupe(combined)
);
}


