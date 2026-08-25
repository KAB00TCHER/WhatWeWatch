// js/steam.js


function normalizeSearchText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(
      /[^\p{L}\p{N}\s]+/gu,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}


function isRelevant(
  title,
  query
) {
  const normalizedTitle =
    normalizeSearchText(title);

  const normalizedQuery =
    normalizeSearchText(query);

  if (
    !normalizedTitle ||
    !normalizedQuery
  ) {
    return false;
  }


  // Полное совпадение
  if (
    normalizedTitle ===
    normalizedQuery
  ) {
    return true;
  }


  // Название содержит весь запрос
  if (
    normalizedTitle.includes(
      normalizedQuery
    )
  ) {
    return true;
  }


  const queryWords =
    normalizedQuery
      .split(' ')
      .filter(Boolean);

  const titleWords =
    new Set(
      normalizedTitle
        .split(' ')
        .filter(Boolean)
    );


  if (!queryWords.length) {
    return false;
  }


  const matches =
    queryWords.filter(word =>
      titleWords.has(word)
    ).length;


  return (
    matches /
      queryWords.length >=
    0.8
  );
}


function extractYear(date) {
  const match =
    String(date || '')
      .match(/\b(19|20)\d{2}\b/);

  return match
    ? Number(match[0])
    : null;
}


function normalizeGenres(
  genres
) {
  if (
    !Array.isArray(genres)
  ) {
    return [];
  }


  const seen =
    new Map();


  for (const genre of genres) {
    const name =
      String(
        genre?.description ??
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


  return [
    ...seen.values(),
  ];
}


function mapSearchGame(
  game
) {
  const appId =
    game?.id;


  if (!appId) {
    return null;
  }


  return {
    id:
      `steam-game-${appId}`,

    provider:
      'steam',

    providerId:
      String(appId),

    title:
      game.name || '',

    originalTitle:
      game.name || '',

    type:
      'game',

    year:
      null,

    rating:
      null,

    poster:
      game.tiny_image ||
      null,

    backdrop:
      null,

    description:
      '',

    genres: [],

    runtime:
      null,

    episodes:
      null,

    playtime:
      null,

    steamAppId:
      appId,

    steamUrl:
      `https://store.steampowered.com/app/${appId}/`,
  };
}


function mapDetails(
  raw
) {
  const appId =
    raw?.steam_appid;


  if (!appId) {
    return null;
  }


  return {
    id:
      `steam-game-${appId}`,

    provider:
      'steam',

    providerId:
      String(appId),

    title:
      raw.name || '',

    originalTitle:
      raw.name || '',

    type:
      'game',

    year:
      extractYear(
        raw.release_date?.date
      ),

    rating:
      null,

    poster:
      raw.header_image ||
      raw.capsule_image ||
      null,

    backdrop:
      raw.background ||
      raw.header_image ||
      null,

    description:
      raw.short_description ||
      raw.detailed_description ||
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
      null,

    steamAppId:
      appId,

    steamUrl:
      `https://store.steampowered.com/app/${appId}/`,
  };
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
      `/api/steam?${query}`
    );


  if (!response.ok) {
    throw new Error(
      `Steam request failed: ${response.status}`
    );
  }


  return response.json();
}


export async function searchSteam(
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


    const games =
      data?.items || [];


    return games
      .filter(game =>
        isRelevant(
          game.name,
          text
        )
      )
      .map(
        mapSearchGame
      )
      .filter(Boolean);


  } catch (error) {
    console.warn(
      '[steam] search error:',
      error
    );

    return [];
  }
}


export async function getSteamDetails(
  providerId
) {
  if (!providerId) {
    return null;
  }


  try {
    const data =
      await request({
        id: providerId,
      });


    const app =
      data?.[providerId];


    if (
      !app?.success ||
      !app?.data
    ) {
      return null;
    }


    return mapDetails(
      app.data
    );


  } catch (error) {
    console.warn(
      '[steam] details error:',
      error
    );

    return null;
  }
}