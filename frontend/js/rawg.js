// js/rawg.js
// Everything related to RAWG (the video game database) lives here — same
// contract as tmdb.js and shikimori.js: fetch, then convert to the app's
// Unified Media Item model.
//
// Setup (roadmap stage 4):
//   1. Go to https://rawg.io/apidocs and sign up (free)
//   2. Fill in the short "developer info" form — takes a few seconds
//   3. Copy the API key shown and paste it below as RAWG_API_KEY
// Until a real key is set, search/details calls quietly return nothing, so
// the rest of the app keeps working off the demo catalogue and library.
//
// Like Shikimori, RAWG's API doesn't send CORS headers, so it's routed
// through the same CORS proxy — see the note in shikimori.js for why, and
// what to swap in if you want something more durable than a free proxy.

const RAWG_API_KEY = '824826cafeb541228ca96281cfb4f0d3';

const BASE_URL = 'https://api.rawg.io/api';
const PROXY_PREFIX = 'https://api.allorigins.win/raw?url=';

function isConfigured() {
  return Boolean(RAWG_API_KEY) && RAWG_API_KEY !== 'YOUR_RAWG_API_KEY_HERE';
}

function proxied(url) {
  return PROXY_PREFIX + encodeURIComponent(url);
}

function buildUrl(path, params = {}) {
  const url = new URL(BASE_URL + path);
  url.searchParams.set('key', RAWG_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function mapResultToModel(raw) {
  return {
    id: `rawg-game-${raw.id}`,
    provider: 'rawg',
    providerId: raw.id,
    title: raw.name,
    originalTitle: raw.name,
    type: 'game',
    year: raw.released ? Number(String(raw.released).slice(0, 4)) : null,
    // RAWG rates games on a 0–5 scale; ×2 keeps it on the same 0–10 scale
    // as the other providers so ratings are comparable across the library.
    rating: typeof raw.rating === 'number' && raw.rating > 0 ? Math.round(raw.rating * 2 * 10) / 10 : null,
    poster: raw.background_image || null,
    backdrop: raw.background_image || null, // RAWG only gives one hero image
    description: null, // not included here — filled in by getRAWGDetails()
    runtime: null,
    episodes: null,
    playtime: raw.playtime || null, // RAWG reports this in hours already
  };
}

function normalizeSearchText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .split(/\s+/)
    .filter(Boolean);
}


function isRelevantGameResult(
  title,
  query
) {
  const queryWords =
    normalizeSearchText(query);

  const titleWords =
    new Set(
      normalizeSearchText(title)
    );

  if (!queryWords.length || !titleWords.size) {
    return false;
  }

  return queryWords.some(
    (word) =>
      titleWords.has(word)
  );
}


export async function searchRAWG(query) {
  if (!isConfigured() || !query.trim()) return [];

  try {
    const target = buildUrl('/games', { search: query, page_size: '20' });
    const res = await fetch(`/api/rawg?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`RAWG search failed: ${res.status}`);
    const data = await res.json();
    return (data.results || [])
  .filter((raw) =>
    isRelevantGameResult(
      raw.name,
      query
    )
  )
  .map(mapResultToModel);
  } catch (err) {
    console.warn('[rawg] search error', err);
    return [];
  }
}

// Fetches the fields search results don't include (description), used when
// opening a detail view or adding a title to the library.
export async function getRAWGDetails(providerId) {
  if (!isConfigured()) return null;

  try {
    const res = await fetch(
      `/api/rawg?id=${providerId}`
    );

    if (!res.ok) {
      throw new Error(
        `RAWG details failed: ${res.status}`
      );
    }

    const raw = await res.json();

    return {
      id: `rawg-game-${raw.id}`,
      provider: 'rawg',
      providerId: raw.id,

      title:
        raw.name || `Game ${raw.id}`,

      originalTitle:
        raw.name || `Game ${raw.id}`,

      type: 'game',

      year: raw.released
        ? Number(
            String(raw.released).slice(0, 4)
          )
        : null,

      rating:
        typeof raw.rating === 'number' &&
        raw.rating > 0
          ? Math.round(
              raw.rating * 2 * 10
            ) / 10
          : null,

      poster:
        raw.background_image || null,

      backdrop:
        raw.background_image_additional ||
        raw.background_image ||
        null,

      description:
        raw.description_raw || '',

      runtime: null,

      episodes: null,

      playtime:
        raw.playtime || null,
    };

  } catch (err) {
    console.warn(
      '[rawg] details error',
      err
    );

    return null;
  }
}