// js/shikimori.js
// Everything related to Shikimori lives here — fetch requests and conversion
// of the API response into the app's Unified Media Item model.
//
// Requests are routed through our own Vercel serverless API (/api/shikimori)
// instead of a public CORS proxy. This removes the dependency on allorigins
// and avoids CORS failures.

const POSTER_BASE = 'https://shikimori.one';

function mapResultToModel(raw) {
  return {
    id: `shikimori-anime-${raw.id}`,
    provider: 'shikimori',
    providerId: raw.id,

    title: raw.russian || raw.name,
    originalTitle: raw.name,

    type: 'anime',

    year: raw.aired_on
      ? Number(String(raw.aired_on).slice(0, 4))
      : null,

    rating:
      raw.score && Number(raw.score) > 0
        ? Number(raw.score)
        : null,

    poster: raw.image?.original
      ? POSTER_BASE + raw.image.original
      : null,

    backdrop: raw.image?.original
      ? POSTER_BASE + raw.image.original
      : null,

    description: raw.description || '',

    runtime: raw.duration || null,

    episodes: raw.episodes || null,

    playtime: null,
  };
}

async function fetchWithTimeout(url, timeout = 8000) {
  const controller = new AbortController();

  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchShikimori(query) {
  if (!query.trim()) return [];

  try {
    const res = await fetchWithTimeout(
      `/api/shikimori?q=${encodeURIComponent(query)}`
    );

    if (!res.ok) {
      throw new Error(`Shikimori search failed: ${res.status}`);
    }

    const data = await res.json();

    return (data || []).map(mapResultToModel);

  } catch (err) {
    console.warn('[shikimori] search error', err);
    return [];
  }
}

export async function getShikimoriDetails(providerId) {
  try {
    const res = await fetchWithTimeout(
      `/api/shikimori?id=${providerId}`
    );

    if (!res.ok) {
      throw new Error(`Shikimori details failed: ${res.status}`);
    }

    const raw = await res.json();

    return {
      description: raw.description || '',
      episodes: raw.episodes || null,
      runtime: raw.duration || null,

      backdrop:
        raw.screenshots?.length
          ? 'https://shikimori.one' + raw.screenshots[0].original
          : null,
    };

  } catch (err) {
    console.warn('[shikimori] details error', err);
    return null;
  }
  
}