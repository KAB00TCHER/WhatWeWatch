// js/shikimori.js

const POSTER_BASE =
  'https://shikimori.one';

const REQUEST_TIMEOUT =
  8000;


function normalizeGenres(
  genres
) {
  if (!Array.isArray(genres)) {
    return [];
  }

  const seen = new Map();

  for (const genre of genres) {
    const name =
      String(
        genre?.russian ??
        genre?.name ??
        genre ??
        ''
      ).trim();

    if (!name) {
      continue;
    }

    const key =
      name.toLocaleLowerCase(
        'ru-RU'
      );

    if (!seen.has(key)) {
      seen.set(key, name);
    }
  }

  return [...seen.values()];
}


function cleanDescription(
  text
) {
  return String(text || '')
    .replace(
      /\[[^\]]+\]/g,
      ''
    )
    .trim();
}


function imageUrl(path) {
  return path
    ? POSTER_BASE + path
    : null;
}


function mapAnime(raw) {
  const poster =
    imageUrl(
      raw.image?.original
    );

  const year =
    raw.aired_on
      ? Number(
          String(
            raw.aired_on
          ).slice(0, 4)
        )
      : null;

  return {
    id:
      `shikimori-anime-${raw.id}`,

    provider:
      'shikimori',

    providerId:
      raw.id,

    title:
      raw.russian ||
      raw.name ||
      `Anime ${raw.id}`,

    originalTitle:
      raw.name ||
      raw.russian ||
      `Anime ${raw.id}`,

    type:
      'anime',

    year,

    rating:
      raw.score &&
      Number(raw.score) > 0
        ? Number(raw.score)
        : null,

    poster,

    backdrop:
      raw.screenshots?.length
        ? imageUrl(
            raw.screenshots[0].original
          )
        : poster,

    description:
      cleanDescription(
        raw.description
      ),

    genres:
      normalizeGenres(
        raw.genres
      ),

    runtime:
      raw.duration || null,

    episodes:
      raw.episodes || null,

    playtime:
      null,
  };
}


async function request(
  params
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT
    );

  try {
    const query =
      new URLSearchParams(
        params
      );

    const response =
      await fetch(
        `/api/shikimori?${query}`,
        {
          signal:
            controller.signal,
        }
      );

    if (!response.ok) {
      throw new Error(
        `Shikimori request failed: ${response.status}`
      );
    }

    return response.json();

  } finally {
    clearTimeout(timer);
  }
}


export async function searchShikimori(
  query
) {
  const text =
    query.trim();

  if (!text) {
    return [];
  }

  try {
    const data =
      await request({
        q: text,
      });

    return (data || [])
      .map(mapAnime);

  } catch (error) {
    console.warn(
      '[shikimori] search error:',
      error
    );

    return [];
  }
}


export async function getShikimoriDetails(
  providerId
) {
  try {
    const raw =
      await request({
        id: providerId,
      });

    return mapAnime(raw);

  } catch (error) {
    console.warn(
      '[shikimori] details error:',
      error
    );

    return null;
  }
}