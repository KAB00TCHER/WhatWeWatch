// js/rawg.js

const RAWG_API_KEY =
  '824826cafeb541228ca96281cfb4f0d3';

const PLACEHOLDER_KEY =
  'YOUR_RAWG_API_KEY_HERE';


function isConfigured() {
  return Boolean(
    RAWG_API_KEY &&
    RAWG_API_KEY !==
      PLACEHOLDER_KEY
  );
}


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


function mapGame(raw) {
  return {
    id:
      `rawg-game-${raw.id}`,

    provider:
      'rawg',

    providerId:
      raw.id,

    title:
      raw.name || '',

    originalTitle:
      raw.name || '',

    type:
      'game',

    year:
      raw.released
        ? Number(
            String(
              raw.released
            ).slice(0, 4)
          )
        : null,

    rating:
      typeof raw.rating === 'number' &&
      raw.rating > 0
        ? Math.round(
            raw.rating * 20
          ) / 10
        : null,

    poster:
      raw.background_image ||
      null,

    backdrop:
      raw.background_image_additional ||
      raw.background_image ||
      null,

    description:
      raw.description_raw ||
      '',

    genres:
      normalizeGenres(
        raw.genres
      ),

    runtime:
      null,

    episodes:
      null,

    playtime:
      raw.playtime || null,
  };
}


function normalizeSearchText(
  text
) {
  return String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(
      /[^\p{L}\p{N}\s]+/gu,
      ' '
    )
    .split(/\s+/)
    .filter(Boolean);
}


function isRelevant(
  title,
  query
) {
  const queryWords =
    normalizeSearchText(
      query
    );

  const titleWords =
    new Set(
      normalizeSearchText(
        title
      )
    );

  if (
    !queryWords.length ||
    !titleWords.size
  ) {
    return false;
  }

  return queryWords.some(
    word =>
      titleWords.has(word)
  );
}


async function request(
  params
) {
  const query =
    new URLSearchParams(
      params
    );

  const response =
    await fetch(
      `/api/rawg?${query}`
    );

  if (!response.ok) {
    throw new Error(
      `RAWG request failed: ${response.status}`
    );
  }

  return response.json();
}


export async function searchRAWG(
  query
) {
  const text =
    query.trim();

  if (
    !isConfigured() ||
    !text
  ) {
    return [];
  }

  try {
    const data =
      await request({
        q: text,
      });

    return (data.results || [])
      .filter(game =>
        isRelevant(
          game.name,
          text
        )
      )
      .map(mapGame);

  } catch (error) {
    console.warn(
      '[rawg] search error:',
      error
    );

    return [];
  }
}


export async function getRAWGDetails(
  providerId
) {
  if (!isConfigured()) {
    return null;
  }

  try {
    const raw =
      await request({
        id: providerId,
      });

    return mapGame(raw);

  } catch (error) {
    console.warn(
      '[rawg] details error:',
      error
    );

    return null;
  }
}