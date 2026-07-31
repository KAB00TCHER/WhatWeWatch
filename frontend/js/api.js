// js/api.js
// The one door the rest of the app uses to search across every provider.
// Each provider module (tmdb.js today; shikimori.js and rawg.js join in
// roadmap stages 3 and 4) is responsible for converting its own response
// into the app's Unified Media Item shape:
//   { id, provider, providerId, title, originalTitle, type, year, rating,
//     poster, backdrop, description, runtime, episodes, playtime }
// api.js just fans out to every provider, merges what comes back, and falls

// even before any API key is configured.

import { searchTMDB, getTMDBDetails } from './tmdb.js';
import { searchShikimori, getShikimoriDetails } from './shikimori.js';
import { searchRAWG, getRAWGDetails } from './rawg.js';


// Add a new provider's search function here — nothing else in the app needs
// to change.
const PROVIDERS = [searchTMDB,searchShikimori, searchRAWG ]; //

// Search results don't carry every field (runtime, episode count,
// description) — each provider that can fill those in later registers a
// fetcher here, keyed by its own `provider` value.
const DETAIL_FETCHERS = {
  tmdb: (item) => getTMDBDetails(item.providerId, item.type),
  shikimori: (item) => getShikimoriDetails(item.providerId),
rawg: (item) => getRAWGDetails(item.providerId),
};

// Fills in the fields a search result is missing (called right before a
// fresh result is shown in the detail modal or added to the library).
// Items already in the library skip this — they were enriched once when
// added and their full data lives in storage.js's cache.
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

export async function searchAll(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const settled = await Promise.allSettled(PROVIDERS.map((search) => search(trimmed)));
  const combined = settled
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value);

 

  return dedupe(combined);
}
