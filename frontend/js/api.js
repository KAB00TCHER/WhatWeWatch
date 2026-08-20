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
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .split(/\s+/)
    .filter(Boolean);
}


function titlesMatch(titleA, titleB) {
  const wordsA = new Set(normalizeTitle(titleA));
  const wordsB = new Set(normalizeTitle(titleB));

  if (!wordsA.size || !wordsB.size) {
    return false;
  }

  let commonWords = 0;

  for (const word of wordsA) {
    if (wordsB.has(word)) {
      commonWords++;
    }
  }

  const smallerTitle =
    Math.min(wordsA.size, wordsB.size);

  return (
    smallerTitle >= 2 &&
    commonWords / smallerTitle >= 0.8
  );
}


function removeAnimeDuplicates(items) {
  const animeItems = items.filter(
    (item) => item.type === 'anime'
  );

  if (!animeItems.length) {
    return items;
  }

  return items.filter((item) => {
    if (
      item.provider !== 'tmdb' ||
      item.type !== 'series'
    ) {
      return true;
    }

    return !animeItems.some((anime) => {
      const titleMatches =
        titlesMatch(
          item.title,
          anime.title
        ) ||
        titlesMatch(
          item.title,
          anime.originalTitle
        ) ||
        titlesMatch(
          item.originalTitle,
          anime.title
        );

      if (!titleMatches) {
        return false;
      }

      const tmdbYear =
        Number(item.year);

      const animeYear =
        Number(anime.year);

      if (
        !tmdbYear ||
        !animeYear
      ) {
        return false;
      }

      return (
        tmdbYear === animeYear
      );
    });
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


