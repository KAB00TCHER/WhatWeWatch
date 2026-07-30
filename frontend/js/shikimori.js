// js/shikimori.js
// Everything related to Shikimori (the anime database) lives here — same
// contract as tmdb.js: fetch, then convert to the app's Unified Media Item
// model. No API key or sign-up needed — Shikimori's read endpoints
// (searching/listing anime) are open to anyone.
//
// One real wrinkle: Shikimori's API doesn't send CORS headers, so a direct
// fetch() from a browser gets blocked before the response ever reaches this
// code (this is Shikimori's limitation, not a bug here — confirmed against
// their API directly). The fix is routing the request through a CORS proxy
// that fetches server-side and re-adds the headers. AllOrigins is used below
// since it works from any domain (not just localhost) and needs no sign-up,
// but it's a free best-effort service with no uptime guarantee. If it ever
// goes down or gets slow, swap PROXY_PREFIX for your own tiny relay (a
// Firebase Cloud Function that fetches Shikimori and returns the JSON works
// well) — nothing else in this file changes.

const BASE_URL = 'https://shikimori.one/api';
const PROXY_PREFIX = 'https://api.allorigins.win/raw?url=';

function proxied(url) {
  return PROXY_PREFIX + encodeURIComponent(url);
}

function mapResultToModel(raw) {
  return {
    id: `shikimori-anime-${raw.id}`,
    provider: 'shikimori',
    providerId: raw.id,
    title: raw.name,
    originalTitle: raw.russian || raw.name,
    type: 'anime',
    year: raw.aired_on ? Number(String(raw.aired_on).slice(0, 4)) : null,
    rating: raw.score ? Math.round(Number(raw.score) * 10) / 10 : null,
    poster: raw.image?.original ? `https://shikimori.one${raw.image.original}` : null,
    backdrop: null, // Shikimori's list/search response doesn't include a separate backdrop
    description: null, // not included here — filled in by getShikimoriDetails()
    runtime: null,
    episodes: raw.episodes || null,
    playtime: null,
  };
}

// Shikimori's own `search` param already matches against both the romaji
// and Russian title fields server-side, so — unlike TMDB — one request
// covers Section 8's "Russian title / English title" requirement without
// needing a second language-scoped pass.
export async function searchShikimori(query) {
  if (!query.trim()) return [];

  try {
    const target = `${BASE_URL}/animes?${new URLSearchParams({ search: query, limit: '20' })}`;
    const res = await fetch(proxied(target));
    if (!res.ok) throw new Error(`Shikimori search failed: ${res.status}`);
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map(mapResultToModel);
  } catch (err) {
    console.warn('[shikimori] search error', err);
    return [];
  }
}

// Fetches the fields the search endpoint doesn't include (description),
// used when opening a detail view or adding a title to the library.
export async function getShikimoriDetails(providerId) {
  try {
    const res = await fetch(proxied(`${BASE_URL}/animes/${providerId}`));
    if (!res.ok) throw new Error(`Shikimori details failed: ${res.status}`);
    const raw = await res.json();
    return {
      description: raw.description || '',
      episodes: raw.episodes || null,
    };
  } catch (err) {
    console.warn('[shikimori] details error', err);
    return null;
  }
}
