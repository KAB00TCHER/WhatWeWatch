// js/tmdb.js

const TMDB_API_KEY =
  '3bf7ec6099886a05fecc861c2f61a533';

const BASE_URL =
  'https://api.themoviedb.org/3';

const POSTER_BASE =
  'https://image.tmdb.org/t/p/w342';

const BACKDROP_BASE =
  'https://image.tmdb.org/t/p/w780';

const CAST_PHOTO_BASE =
  'https://image.tmdb.org/t/p/w185';

const PROVIDER_LOGO_BASE =
  'https://image.tmdb.org/t/p/w92';

const SEARCH_PAGES = 3;


// =========================================================
// HELPERS
// =========================================================

function isConfigured() {
  return Boolean(
    TMDB_API_KEY &&
    TMDB_API_KEY !==
      'YOUR_TMDB_API_KEY_HERE'
  );
}


function buildUrl(
  path,
  params = {}
) {
  const url =
    new URL(
      BASE_URL + path
    );

  url.searchParams.set(
    'api_key',
    TMDB_API_KEY
  );

  for (
    const [key, value]
    of Object.entries(params)
  ) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      url.searchParams.set(
        key,
        value
      );
    }
  }

  return url.toString();
}


function normalizeGenres(
  genres
) {
  if (!Array.isArray(genres)) {
    return [];
  }

  const result =
    new Map();

  for (const genre of genres) {
    const name =
      String(
        genre?.name ||
        genre ||
        ''
      ).trim();

    if (!name) {
      continue;
    }

    const key =
      name.toLocaleLowerCase(
        'ru-RU'
      );

    if (!result.has(key)) {
      result.set(key, name);
    }
  }

  return [...result.values()];
}


function uniqueNames(
  names
) {
  return [
    ...new Set(
      names.filter(Boolean)
    ),
  ];
}


function getYear(
  date
) {
  return date
    ? Number(
        String(date).slice(0, 4)
      )
    : null;
}


function roundRating(
  value
) {
  return typeof value === 'number'
    ? Math.round(value * 10) / 10
    : null;
}


function imageUrl(
  base,
  path
) {
  return path
    ? base + path
    : null;
}


// =========================================================
// SEARCH
// =========================================================

function mapSearchResult(
  raw,
  type
) {
  const isMovie =
    type === 'movie';

  const date =
    isMovie
      ? raw.release_date
      : raw.first_air_date;

  return {
    id:
      `tmdb-${type === 'movie' ? 'movie' : 'tv'}-${raw.id}`,

    provider:
      'tmdb',

    providerId:
      raw.id,

    title:
      isMovie
        ? raw.title
        : raw.name,

    originalTitle:
      isMovie
        ? raw.original_title
        : raw.original_name,

    type:
      isMovie
        ? 'movie'
        : 'series',

    year:
      getYear(date),

    rating:
      roundRating(
        raw.vote_average
      ),

    poster:
      imageUrl(
        POSTER_BASE,
        raw.poster_path
      ),

    backdrop:
      imageUrl(
        BACKDROP_BASE,
        raw.backdrop_path
      ),

    description:
      raw.overview || '',

    genres: [],

    runtime: null,

    episodes: null,

    playtime: null,
  };
}


function parseSearchQuery(
  query
) {
  const text =
    query.trim();

  const match =
    text.match(
      /(?:^|\s)((?:19|20)\d{2})\s*$/
    );

  if (!match) {
    return {
      title: text,
      year: null,
    };
  }

  return {
    title:
      text
        .slice(0, match.index)
        .trim(),

    year:
      Number(match[1]),
  };
}


async function fetchSearchPage(
  query,
  language,
  page,
  type,
  year
) {
  const isMovie =
    type === 'movie';

  const params = {
    query,
    language,
    include_adult: 'true',
    page,
  };

  if (year) {
    params[
      isMovie
        ? 'year'
        : 'first_air_date_year'
    ] = year;
  }

  const response =
    await fetch(
      buildUrl(
        isMovie
          ? '/search/movie'
          : '/search/tv',
        params
      )
    );

  if (!response.ok) {
    throw new Error(
      `TMDB ${type} search failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  return (
    data.results || []
  ).map(
    raw =>
      mapSearchResult(
        raw,
        type
      )
  );
}


async function fetchSearch(
  query,
  language,
  type,
  year
) {
  const pages =
    await Promise.all(
      Array.from(
        {
          length:
            SEARCH_PAGES,
        },
        (_, index) =>
          fetchSearchPage(
            query,
            language,
            index + 1,
            type,
            year
          )
      )
    );

  return pages.flat();
}


function normalizeSearchText(
  text
) {
  return String(text || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(
      /[^a-zа-я0-9\s]+/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}


function calculateSearchScore(
  item,
  query,
  year
) {
  const search =
    normalizeSearchText(
      query
    );

  const title =
    normalizeSearchText(
      item.title
    );

  const originalTitle =
    normalizeSearchText(
      item.originalTitle
    );

  if (!search || !title) {
    return 0;
  }

  let score = 0;

  if (title === search) {
    score += 10000;
  }

  if (
    originalTitle === search
  ) {
    score += 9500;
  }

  if (
    title.startsWith(search)
  ) {
    score += 4000;
  }

  if (
    originalTitle.startsWith(search)
  ) {
    score += 3500;
  }

  if (
    title.split(' ')
      .includes(search)
  ) {
    score += 2500;
  }

  if (
    originalTitle
      .split(' ')
      .includes(search)
  ) {
    score += 2200;
  }

  if (
    title.includes(search)
  ) {
    score += 1000;
  }

  if (
    originalTitle.includes(search)
  ) {
    score += 800;
  }

  if (year) {
    score +=
      Number(item.year) === year
        ? 5000
        : -2500;
  }

  if (
    typeof item.rating === 'number'
  ) {
    score += item.rating * 20;
  }

  return score;
}


function mergeSearchResults(
  items
) {
  const merged =
    new Map();

  for (const item of items) {
    const key =
      `${item.type}:${item.providerId}`;

    const existing =
      merged.get(key);

    if (!existing) {
      merged.set(
        key,
        item
      );

      continue;
    }

    merged.set(
      key,
      {
        ...existing,

        title:
          item.title !==
          item.originalTitle
            ? item.title
            : existing.title,

        description:
          item.description &&
          item.description.length >
            existing.description.length
            ? item.description
            : existing.description,

        poster:
          existing.poster ||
          item.poster,

        backdrop:
          existing.backdrop ||
          item.backdrop,

        rating:
          item.rating ??
          existing.rating,
      }
    );
  }

  return [
    ...merged.values(),
  ];
}


export async function searchTMDB(
  query
) {
  if (
    !isConfigured() ||
    !query.trim()
  ) {
    return [];
  }

  const {
    title,
    year,
  } =
    parseSearchQuery(query);

  if (!title) {
    return [];
  }

  try {
    const requests = [];

    for (
      const language
      of ['en-US', 'ru-RU']
    ) {
      for (
        const type
        of ['movie', 'tv']
      ) {
        requests.push(
          fetchSearch(
            title,
            language,
            type,
            year
          )
        );
      }
    }

    const settled =
      await Promise.allSettled(
        requests
      );

    const results =
      settled
        .filter(
          result =>
            result.status ===
            'fulfilled'
        )
        .flatMap(
          result =>
            result.value
        );

    return mergeSearchResults(
      results
    )
      .map(item => ({
        item,
        score:
          calculateSearchScore(
            item,
            title,
            year
          ),
      }))
      .sort(
        (a, b) =>
          b.score - a.score
      )
      .map(
        ({ item }) =>
          item
      );

  } catch (error) {
    console.warn(
      '[tmdb] search error:',
      error
    );

    return [];
  }
}


// =========================================================
// DETAILS
// =========================================================

function getEndpoint(
  type,
  id,
  suffix = ''
) {
  return type === 'movie'
    ? `/movie/${id}${suffix}`
    : `/tv/${id}${suffix}`;
}


async function getJson(
  response
) {
  return response.ok
    ? response.json()
    : {};
}


function mapCredits(
  credits
) {
  const crew =
    credits.crew || [];

  const director =
    uniqueNames(
      crew
        .filter(
          person =>
            person.job ===
            'Director'
        )
        .map(
          person =>
            person.name
        )
    ).join(', ');


  const writers =
    uniqueNames(
      crew
        .filter(
          person =>
            [
              'Writer',
              'Screenplay',
              'Story',
              'Teleplay',
            ].includes(
              person.job
            )
        )
        .map(
          person =>
            person.name
        )
    ).slice(0, 5);


  const cast =
    (credits.cast || [])
      .slice(0, 12)
      .map(
        person => ({
          id:
            person.id,

          name:
            person.name || '',

          character:
            person.character || '',

          photo:
            imageUrl(
              CAST_PHOTO_BASE,
              person.profile_path
            ),
        })
      )
      .filter(
        person =>
          person.name
      );


  return {
    director:
      director || null,

    writers,

    cast,
  };
}


function getCountries(
  raw,
  isMovie
) {
  if (isMovie) {
    return (
      raw.production_countries || []
    )
      .map(
        country =>
          country.name
      )
      .filter(Boolean);
  }

  return (
    raw.origin_country || []
  ).filter(Boolean);
}


// =========================================================
// RECOMMENDATIONS
// =========================================================

function scoreRecommendation(
  candidate,
  sourceYear,
  sourceGenres
) {
  const date =
    candidate.release_date ||
    candidate.first_air_date;

  const year =
    getYear(date);

  const genres =
    Array.isArray(
      candidate.genre_ids
    )
      ? candidate.genre_ids
      : [];

  const commonGenres =
    genres.filter(
      id =>
        sourceGenres.has(
          Number(id)
        )
    ).length;

  const rating =
    typeof candidate.vote_average ===
    'number'
      ? candidate.vote_average
      : 0;

  const voteCount =
    Number(
      candidate.vote_count || 0
    );

  let yearScore = 0;

  if (
    sourceYear &&
    year
  ) {
    const difference =
      Math.abs(
        sourceYear - year
      );

    if (difference <= 5) {
      yearScore = 30;
    } else if (difference <= 10) {
      yearScore = 20;
    } else if (difference <= 20) {
      yearScore = 10;
    }
  }

  return {
    candidate,
    score:
      commonGenres * 35 +
      rating * 8 +
      Math.min(
        voteCount / 1000,
        20
      ) +
      yearScore,

    rating,
    voteCount,
    year,
  };
}


function mapRecommendation(
  candidate,
  type
) {
  const isMovie =
    type === 'movie';

  const date =
    isMovie
      ? candidate.release_date
      : candidate.first_air_date;

  return {
    id:
      `tmdb-${isMovie ? 'movie' : 'series'}-${candidate.id}`,

    provider:
      'tmdb',

    providerId:
      candidate.id,

    title:
      isMovie
        ? candidate.title
        : candidate.name,

    type:
      isMovie
        ? 'movie'
        : 'series',

    year:
      getYear(date),

    rating:
      roundRating(
        candidate.vote_average
      ),

    poster:
      imageUrl(
        POSTER_BASE,
        candidate.poster_path
      ),

    backdrop:
      imageUrl(
        BACKDROP_BASE,
        candidate.backdrop_path
      ),
  };
}


function buildRecommendations(
  recommendations,
  raw,
  providerId,
  type
) {
  const sourceYear =
    getYear(
      type === 'movie'
        ? raw.release_date
        : raw.first_air_date
    );

  const sourceGenres =
    new Set(
      (raw.genres || [])
        .map(
          genre =>
            Number(genre.id)
        )
        .filter(Boolean)
    );

  return (
    recommendations.results || []
  )
    .filter(
      candidate =>
        candidate?.id &&
        Number(candidate.id) !==
          Number(providerId)
    )
    .map(
      candidate =>
        scoreRecommendation(
          candidate,
          sourceYear,
          sourceGenres
        )
    )
    .filter(
      item =>
        (!item.year ||
          item.year >= 2000) &&
        item.rating >= 6 &&
        item.voteCount >= 100
    )
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .slice(0, 6)
    .map(
      ({ candidate }) =>
        mapRecommendation(
          candidate,
          type
        )
    )
    .filter(
      item =>
        item.poster
    );
}


// =========================================================
// COLLECTION
// =========================================================

async function getCollection(
  raw
) {
  const id =
    raw.belongs_to_collection?.id;

  if (!id) {
    return null;
  }

  try {
    const response =
      await fetch(
        buildUrl(
          `/collection/${id}`,
          {
            language: 'ru-RU',
          }
        )
      );

    return response.ok
      ? response.json()
      : null;

  } catch (error) {
    console.warn(
      '[tmdb] collection error:',
      error
    );

    return null;
  }
}


function buildRelatedItems(
  collection,
  providerId
) {
  if (
    !Array.isArray(
      collection?.parts
    )
  ) {
    return [];
  }

  return collection.parts
    .filter(
      part =>
        Number(part.id) !==
        Number(providerId)
    )
    .sort(
      (a, b) =>
        (
          a.release_date
            ? new Date(
                a.release_date
              ).getTime()
            : Infinity
        ) -
        (
          b.release_date
            ? new Date(
                b.release_date
              ).getTime()
            : Infinity
        )
    )
    .map(
      part => ({
        id:
          `tmdb-movie-${part.id}`,

        provider:
          'tmdb',

        providerId:
          part.id,

        title:
          part.title || '',

        type:
          'movie',

        year:
          getYear(
            part.release_date
          ),

        rating:
          roundRating(
            part.vote_average
          ),

        poster:
          imageUrl(
            POSTER_BASE,
            part.poster_path
          ),

        backdrop:
          imageUrl(
            BACKDROP_BASE,
            part.backdrop_path
          ),
      })
    )
    .filter(
      item =>
        item.poster
    );
}


// =========================================================
// WATCH PROVIDERS
// =========================================================

function buildWatchProviders(
  providers
) {
  const region =
    providers.results?.RU;

  const groups = [
    ...(region?.flatrate || []),
    ...(region?.free || []),
    ...(region?.ads || []),
    ...(region?.rent || []),
    ...(region?.buy || []),
  ];

  const unique =
    new Map();

  for (const provider of groups) {
    if (
      unique.has(
        provider.provider_id
      )
    ) {
      continue;
    }

    unique.set(
      provider.provider_id,
      {
        id:
          provider.provider_id,

        name:
          provider.provider_name,

        logo:
          imageUrl(
            PROVIDER_LOGO_BASE,
            provider.logo_path
          ),
      }
    );
  }

  return [
    ...unique.values(),
  ].slice(0, 10);
}


// =========================================================
// MONEY
// =========================================================

function formatMoney(
  value
) {
  const number =
    Number(value);

  if (
    !number ||
    number <= 0
  ) {
    return null;
  }

  if (
    number >=
    1_000_000_000
  ) {
    return `$${(
      number /
      1_000_000_000
    ).toFixed(1)} млрд`;
  }

  if (
    number >=
    1_000_000
  ) {
    return `$${(
      number /
      1_000_000
    ).toFixed(1)} млн`;
  }

  return `$${number.toLocaleString(
    'ru-RU'
  )}`;
}


// =========================================================
// DETAILS
// =========================================================

export async function getTMDBDetails(
  providerId,
  type
) {
  if (!isConfigured()) {
    return null;
  }

  const isMovie =
    type === 'movie';

  const detailsPath =
    getEndpoint(
      type,
      providerId
    );

  try {
    const [
      detailsResponse,
      creditsResponse,
      recommendationsResponse,
      providersResponse,
    ] = await Promise.all([
      fetch(
        buildUrl(
          detailsPath,
          {
            language: 'ru-RU',
          }
        )
      ),

      fetch(
        buildUrl(
          getEndpoint(
            type,
            providerId,
            '/credits'
          ),
          {
            language: 'ru-RU',
          }
        )
      ),

      fetch(
        buildUrl(
          getEndpoint(
            type,
            providerId,
            '/recommendations'
          ),
          {
            language: 'ru-RU',
            page: 1,
          }
        )
      ),

      fetch(
        buildUrl(
          getEndpoint(
            type,
            providerId,
            '/watch/providers'
          )
        )
      ),
    ]);

    if (!detailsResponse.ok) {
      throw new Error(
        `TMDB details failed: ${detailsResponse.status}`
      );
    }

    const [
      raw,
      credits,
      recommendations,
      providers,
    ] = await Promise.all([
      detailsResponse.json(),
      getJson(
        creditsResponse
      ),
      getJson(
        recommendationsResponse
      ),
      getJson(
        providersResponse
      ),
    ]);

    const date =
      isMovie
        ? raw.release_date
        : raw.first_air_date;

    const collection =
      isMovie
        ? await getCollection(raw)
        : null;

    const {
      director,
      writers,
      cast,
    } =
      mapCredits(credits);

    const related =
      buildRelatedItems(
        collection,
        providerId
      );

    const similar =
      buildRecommendations(
        recommendations,
        raw,
        providerId,
        type
      );

    return {
      id:
        `tmdb-${isMovie ? 'movie' : 'series'}-${raw.id}`,

      provider:
        'tmdb',

      providerId:
        raw.id,

      title:
        isMovie
          ? raw.title
          : raw.name,

      originalTitle:
        isMovie
          ? raw.original_title
          : raw.original_name,

      type,

      year:
        getYear(date),

      rating:
        roundRating(
          raw.vote_average
        ),

      poster:
        imageUrl(
          POSTER_BASE,
          raw.poster_path
        ),

      backdrop:
        imageUrl(
          BACKDROP_BASE,
          raw.backdrop_path
        ),

      description:
        raw.overview || '',

      genres:
        normalizeGenres(
          raw.genres
        ),

      runtime:
        isMovie
          ? raw.runtime ?? null
          : null,

      episodes:
        type === 'series'
          ? raw.number_of_episodes ??
            null
          : null,

      playtime:
        null,

      countries:
        getCountries(
          raw,
          isMovie
        ),

      language:
        raw.original_language
          ? raw.original_language.toUpperCase()
          : null,

      budget:
        isMovie
          ? formatMoney(
              raw.budget
            )
          : null,

      revenue:
        isMovie
          ? formatMoney(
              raw.revenue
            )
          : null,

      director,

      writers,

      cast,

      watchProviders:
        buildWatchProviders(
          providers
        ),

      related,

      similar,
    };

  } catch (error) {
    console.warn(
      '[tmdb] details error:',
      error
    );

    return null;
  }
}