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
    return extra ? { ...item, ...extra } : item;
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

export async function searchAll(query, type = 'all') {
  const trimmed = (query || '').trim();

  if (!trimmed) return [];

  let providers;

  switch (type) {
    case 'movie':
      providers = [
        async (q) =>
          (await searchTMDB(q)).filter((item) => item.type === 'movie'),
      ];
      break;

    case 'series':
      providers = [
        async (q) =>
          (await searchTMDB(q)).filter((item) => item.type === 'series'),
      ];
      break;

    case 'anime':
      providers = [searchShikimori];
      break;

    case 'game':
      providers = [searchRAWG];
      break;

    default:
      providers = [
        searchTMDB,
        searchShikimori,
        searchRAWG,
      ];
  }

  const settled = await Promise.allSettled(
    providers.map((search) => search(trimmed))
  );

  const combined = settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

  return dedupe(combined);
}