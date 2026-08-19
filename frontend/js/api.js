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

  return dedupe(combined);
}