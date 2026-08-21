// js/tmdb.js
// Everything related to TMDB (The Movie Database) lives here: the raw fetch
// calls and the conversion of TMDB's response shape into the app's Unified
// Media Item model. No other file should know what a "media_type" or a
// "poster_path" is — that's tmdb.js's job.
//
// Setup (roadmap stage 2):
//   1. Create a free account at https://www.themoviedb.org/
//   2. Settings -> API -> request a free API key (v3 auth)
//   3. Paste it below as TMDB_API_KEY
// Until a real key is set, search/details calls quietly return nothing, so
// the rest of the app keeps working off the demo catalogue and library.

const TMDB_API_KEY = '3bf7ec6099886a05fecc861c2f61a533';

const BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';
const SEARCH_PAGES = 3;


function isConfigured() {
  return Boolean(TMDB_API_KEY) && TMDB_API_KEY !== 'YOUR_TMDB_API_KEY_HERE';
}

function buildUrl(path, params = {}) {
  const url = new URL(BASE_URL + path);
  url.searchParams.set('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

// TMDB's /search/multi returns movies, tv shows, AND people in one list —
// we only want the first two, mapped onto our own `type` values.
function mapResultToModel(raw) {
  if (raw.media_type !== 'movie' && raw.media_type !== 'tv') return null;
  const isMovie = raw.media_type === 'movie';
  const dateStr = isMovie ? raw.release_date : raw.first_air_date;

  return {
    id: `tmdb-${raw.media_type}-${raw.id}`,
    provider: 'tmdb',
    providerId: raw.id,
    title: isMovie ? raw.title : raw.name,
    originalTitle: isMovie ? raw.original_title : raw.original_name,
    type: isMovie ? 'movie' : 'series',
    year: dateStr ? Number(dateStr.slice(0, 4)) : null,
    rating: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : null,
    poster: raw.poster_path ? POSTER_BASE + raw.poster_path : null,
    backdrop: raw.backdrop_path ? BACKDROP_BASE + raw.backdrop_path : null,
    description: raw.overview || '',
    genres: [],
    runtime: null,   // only available from getTMDBDetails()
    episodes: null,  // only available from getTMDBDetails()
    playtime: null,  // not applicable to TMDB
  };
}

async function fetchSearchPage(query, language, page) {
  const res = await fetch(
    buildUrl('/search/multi', {
      query,
      language,
      include_adult: 'true',
      page,
    })
  );

  if (!res.ok) {
    throw new Error(`TMDB search failed: ${res.status}`);
  }

  const data = await res.json();

  return (data.results || [])
    .map(mapResultToModel)
    .filter(Boolean);
}

async function fetchSearch(query, language) {
  const pages = await Promise.all(
    Array.from(
      { length: SEARCH_PAGES },
      (_, index) => fetchSearchPage(query, language, index + 1)
    )
  );

  return pages.flat();
}

// TMDB's own matching depends partly on which `language` is active, so one
// search in English misses titles that only match their Russian translation
// (and vice versa). Firing both in parallel and merging covers Section 8's
// "Russian title / English title" requirement much better than a single
// pass — it's a heuristic, not a guarantee (TMDB decides what matches), but
// it noticeably widens what turns up.
export async function searchTMDB(query) {
  if (!isConfigured() || !query.trim()) return [];

  try {
    const [en, ru] = await Promise.allSettled([
      fetchSearch(query, 'en-US'),
      fetchSearch(query, 'ru-RU'),
    ]);

    const combined = [
      ...(en.status === 'fulfilled' ? en.value : []),
      ...(ru.status === 'fulfilled' ? ru.value : []),
    ];

    const merged = new Map();

    for (const item of combined) {
      const key = `${item.type}-${item.providerId}`;

      if (!merged.has(key)) {
        merged.set(key, item);
        continue;
      }

      const existing = merged.get(key);

      merged.set(key, {
        ...existing,

        // Русская версия приходит второй — она должна иметь приоритет
        title:
          item.title !== item.originalTitle
            ? item.title
            : existing.title,

        description:
          item.description && item.description.length > existing.description.length
            ? item.description
            : existing.description,

        poster: existing.poster || item.poster,
        backdrop: existing.backdrop || item.backdrop,
      });
    }

    return [...merged.values()];
  } catch (err) {
    console.warn('[tmdb] search error', err);
    return [];
  }
}

// Fetches the fields search results don't include (runtime, episode count),
// used when opening a detail view or adding a title to the library.
export async function getTMDBDetails(providerId, type) {
  if (!isConfigured()) return null;

  const path =
    type === 'movie'
      ? `/movie/${providerId}`
      : `/tv/${providerId}`;

  try {
    const res = await fetch(
      buildUrl(path, { language: 'ru-RU' })
    );

    if (!res.ok) {
      throw new Error(
        `TMDB details failed: ${res.status}`
      );
    }

    const raw = await res.json();

    const isMovie = type === 'movie';

    const dateStr = isMovie
      ? raw.release_date
      : raw.first_air_date;

    return {
      id: `tmdb-${isMovie ? 'movie' : 'series'}-${raw.id}`,
      provider: 'tmdb',
      providerId: raw.id,

      title: isMovie
        ? raw.title
        : raw.name,

      originalTitle: isMovie
        ? raw.original_title
        : raw.original_name,

      type,

      year: dateStr
        ? Number(dateStr.slice(0, 4))
        : null,

      rating:
        typeof raw.vote_average === 'number'
          ? Math.round(raw.vote_average * 10) / 10
          : null,

      poster: raw.poster_path
        ? POSTER_BASE + raw.poster_path
        : null,

      backdrop: raw.backdrop_path
        ? BACKDROP_BASE + raw.backdrop_path
        : null,

      description:
        raw.overview || '',

      genres:
  Array.isArray(raw.genres)
    ? raw.genres.map((genre) => genre.name)
    : [],

      runtime:
        isMovie
          ? raw.runtime ?? null
          : null,

      episodes:
        type === 'series'
          ? raw.number_of_episodes ?? null
          : null,

      playtime: null,
    };

  } catch (err) {
    console.warn(
      '[tmdb] details error',
      err
    );

    return null;
  }
}