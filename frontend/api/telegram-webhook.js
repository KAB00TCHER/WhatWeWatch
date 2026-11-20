const TMDB_BASE =
  'https://api.themoviedb.org/3';

const TMDB_IMAGE =
  'https://image.tmdb.org/t/p/w500';

const TMDB_THUMB =
  'https://image.tmdb.org/t/p/w185';


  const TMDB_GENRES = {
  12: 'Приключения',
  14: 'Фэнтези',
  16: 'Мультфильм',
  18: 'Драма',
  27: 'Ужасы',
  28: 'Боевик',
  35: 'Комедия',
  36: 'История',
  37: 'Вестерн',
  53: 'Триллер',
  80: 'Криминал',
  99: 'Документальный',
  878: 'Фантастика',
  9648: 'Детектив',
  10402: 'Музыка',
  10749: 'Мелодрама',
  10751: 'Семейный',
  10752: 'Военный',
  10759: 'Боевик и приключения',
  10762: 'Детский',
  10763: 'Новости',
  10764: 'Реалити',
  10765: 'Фантастика и фэнтези',
  10766: 'Мыльная опера',
  10767: 'Ток-шоу',
  10768: 'Военный и политический',
  10770: 'Телефильм',
};

// =========================================================
// HELPERS
// =========================================================

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function getYear(date) {
  if (!date) {
    return null;
  }

  const year =
    Number(String(date).slice(0, 4));

  return year || null;
}


// =========================================================
// TMDB SEARCH
// =========================================================

async function searchTMDB(
  query,
  language,
  type
) {
  const apiKey =
    process.env.TMDB_API_KEY;

  if (!apiKey) {
    throw new Error(
      'TMDB_API_KEY is not configured'
    );
  }

  const url =
    new URL(
      `${TMDB_BASE}/search/${type}`
    );

  url.searchParams.set(
    'api_key',
    apiKey
  );

  url.searchParams.set(
    'query',
    query
  );

  url.searchParams.set(
    'language',
    language
  );

  url.searchParams.set(
    'include_adult',
    'false'
  );

  url.searchParams.set(
    'page',
    '1'
  );

  const response =
    await fetch(url);

  if (!response.ok) {
    throw new Error(
      `TMDB search failed: ${response.status}`
    );
  }

  const data =
    await response.json();

  return (
    data.results || []
  ).map(item => {
    const isMovie =
      type === 'movie';

    return {
      id: item.id,

      type,

      title:
        isMovie
          ? item.title
          : item.name,

      originalTitle:
        isMovie
          ? item.original_title
          : item.original_name,

      date:
        isMovie
          ? item.release_date
          : item.first_air_date,

      overview:
        item.overview || '',

      genreIds:
        Array.isArray(item.genre_ids)
          ? item.genre_ids
          : [],

      rating:
        Number(item.vote_average || 0),

      popularity:
        Number(item.popularity || 0),

      poster:
        item.poster_path
          ? `${TMDB_IMAGE}${item.poster_path}`
          : null,

      thumb:
        item.poster_path
          ? `${TMDB_THUMB}${item.poster_path}`
          : null,
    };
  });
}


// =========================================================
// SEARCH RANKING
// =========================================================

function scoreResult(item, query) {
  const search =
    normalizeText(query);

  const title =
    normalizeText(item.title);

  const original =
    normalizeText(item.originalTitle);

  let score = 0;

  if (title === search) {
    score += 10000;
  }

  if (original === search) {
    score += 9000;
  }

  if (title.startsWith(search)) {
    score += 3000;
  }

  if (original.startsWith(search)) {
    score += 2500;
  }

  if (title.includes(search)) {
    score += 1000;
  }

  if (original.includes(search)) {
    score += 800;
  }

  score += item.rating * 10;
  score += Math.min(item.popularity, 100);

  return score;
}


// =========================================================
// TELEGRAM INLINE RESULTS
// =========================================================





function createInlineResult(item) {
  const year = getYear(item.date);

  const typeLabel =
    item.type === 'movie' ? 'Фильм' : 'Сериал';

  const rating = item.rating
    ? item.rating.toFixed(1)
    : 'Нет оценки';

  const originalTitle =
    item.originalTitle &&
    normalizeText(item.originalTitle) !==
      normalizeText(item.title)
      ? item.originalTitle
      : null;

  const genres = (item.genreIds || [])
    .map(id => TMDB_GENRES[id])
    .filter(Boolean)
    .slice(0, 3);

  const genreLine = genres.length
    ? genres.join(' · ')
    : null;

  const overview = String(item.overview || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 350);

  const displayTitle = year
    ? `${item.title} (${year})`
    : item.title;

  const messageParts = [
    `<b>${escapeHtml(item.title)}</b>`,
  ];

  if (originalTitle) {
    messageParts.push(
      `<i>${escapeHtml(originalTitle)}</i>`
    );
  }

  messageParts.push(
    `${typeLabel}${year ? ` · ${year}` : ''}`,
    `Рейтинг TMDB: <b>${rating}</b>`
  );

  if (genreLine) {
    messageParts.push(
      `Жанры: ${escapeHtml(genreLine)}`
    );
  }

  if (overview) {
    messageParts.push(
      '',
      escapeHtml(overview)
    );
  }

  messageParts.push(
    '',
    '<i>Найдено через WhatWeWatch</i>'
  );

  const mediaUrl =
    `https://www.themoviedb.org/${item.type}/${item.id}`;

  const kinoMixSearchUrl =
    `https://kinomix.web.app/search?query=${encodeURIComponent(
      year
        ? `${item.title} ${year}`
        : item.title
    )}`;

  return {
    type: 'article',

    id: `tmdb-${item.type}-${item.id}`,

    title: displayTitle,

    description: [
      typeLabel,
      year || 'Год неизвестен',
      `Рейтинг TMDB ${rating}`,
      genreLine,
      originalTitle,
    ]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 255),

    thumbnail_url: item.thumb || undefined,

    input_message_content: {
      message_text: messageParts.join('\n'),
      parse_mode: 'HTML',
    },

    reply_markup: {
      inline_keyboard: [
        [
          {
            text: 'Подробнее в TMDB',
            url: mediaUrl,
          },
          {
            text: 'Найти на KinoMix',
            url: kinoMixSearchUrl,
          },
        ],
      ],
    },
  };
}





// =========================================================
// EMPTY RESULTS
// =========================================================

function createArticle(
  id,
  title,
  description,
  message
) {
  return {
    type: 'article',

    id,

    title,

    description,

    input_message_content: {
      message_text: message,
    },
  };
}


// =========================================================
// INLINE SEARCH
// =========================================================

async function findMedia(query) {
  const requests = [];

  for (const language of ['ru-RU', 'en-US']) {
    for (const type of ['movie', 'tv']) {
      requests.push(
        searchTMDB(
          query,
          language,
          type
        )
      );
    }
  }

  const settled =
    await Promise.allSettled(requests);

  const results =
    settled
      .filter(result =>
        result.status === 'fulfilled'
      )
      .flatMap(result =>
        result.value
      );

  const unique =
    new Map();

  for (const item of results) {
    if (!item.poster || !item.title) {
      continue;
    }

    const key =
      `${item.type}-${item.id}`;

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return [...unique.values()]
    .map(item => ({
      item,

      score:
        scoreResult(item, query),
    }))
    .sort((a, b) =>
      b.score - a.score
    )
    .slice(0, 20)
    .map(result =>
      createInlineResult(result.item)
    );
}


// =========================================================
// ANSWER INLINE QUERY
// =========================================================

async function answerInlineQuery(
  queryId,
  results
) {
  const token =
    process.env.TELEGRAM_BOT_TOKEN;

  const response =
    await fetch(
      `https://api.telegram.org/bot${token}/answerInlineQuery`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          inline_query_id: queryId,

          results,

          cache_time: 60,

          is_personal: false,
        }),
      }
    );

  const data =
    await response.json();

  if (!response.ok || !data.ok) {
    console.error(
      '[telegram-inline] answerInlineQuery failed:',
      data
    );

    throw new Error(
      'Telegram answerInlineQuery failed'
    );
  }
}


// =========================================================
// WEBHOOK HANDLER
// =========================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      error: 'Method not allowed',
    });
  }

  const expectedSecret =
    process.env.TELEGRAM_WEBHOOK_SECRET;

  const receivedSecret =
    req.headers[
      'x-telegram-bot-api-secret-token'
    ];

  if (
    !expectedSecret ||
    receivedSecret !== expectedSecret
  ) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  try {
    const update =
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body;

    const inlineQuery =
      update?.inline_query;

    if (!inlineQuery) {
      return res.status(200).json({
        ok: true,
      });
    }

    const query =
      String(inlineQuery.query || '')
        .trim()
        .slice(0, 100);

    // Пользователь ещё ничего не ввёл.

    if (query.length < 2) {
      const help =
        createArticle(
          'help',
          'Поиск фильмов и сериалов',
          'Начни вводить название',
          'WhatWeWatch — поиск фильмов и сериалов прямо в Telegram.'
        );

      await answerInlineQuery(
        inlineQuery.id,
        [help]
      );

      return res.status(200).json({
        ok: true,
      });
    }

    // Ищем результаты в TMDB.

    const results =
      await findMedia(query);

    if (!results.length) {
      const empty =
        createArticle(
          'no-results',
          'Ничего не найдено',
          'Попробуй другое название',
          `По запросу «${query}» ничего не найдено.`
        );

      await answerInlineQuery(
        inlineQuery.id,
        [empty]
      );

      return res.status(200).json({
        ok: true,
      });
    }

    await answerInlineQuery(
      inlineQuery.id,
      results
    );

    return res.status(200).json({
      ok: true,
    });

  } catch (error) {
    console.error(
      '[telegram-webhook] Error:',
      error
    );

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}