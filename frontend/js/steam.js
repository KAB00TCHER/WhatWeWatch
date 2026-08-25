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


  // Название содержит запрос целиком
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


  const matched =
    queryWords.filter(
      word =>
        titleWords.has(word)
    ).length;


  // Одно слово:
  // достаточно наличия этого слова
  if (
    queryWords.length === 1
  ) {
    return matched === 1;
  }


  // Два слова:
  // оба должны совпадать
  if (
    queryWords.length === 2
  ) {
    return matched === 2;
  }


  // Три и более слов:
  // достаточно 60% совпадения
  return (
    matched /
      queryWords.length >=
    0.6
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
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,

    backdrop:
      `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,


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
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,

backdrop:
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_hero.jpg`,

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


    console.log(
      '[steam] raw results:',
      games
    );


    const relevant =
      games
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


    console.log(
      '[steam] relevant results:',
      relevant
    );


    return relevant;


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