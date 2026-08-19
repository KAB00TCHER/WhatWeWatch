const RAWG_API_KEY = '824826cafeb541228ca96281cfb4f0d3';

const BASE_URL = 'https://api.rawg.io/api';

// RAWG может зависнуть, поэтому не позволяем Vercel
// ждать его бесконечно долго.
const RAWG_TIMEOUT_MS = 3500;

async function fetchRAWG(url) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, RAWG_TIMEOUT_MS);

  try {
    return await fetch(url, {
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  try {
    const { q, id } = req.query;

    let url;

    // Получение подробностей игры
    if (id) {
      url = new URL(`${BASE_URL}/games/${id}`);
      url.searchParams.set('key', RAWG_API_KEY);

    // Поиск игр
    } else if (q) {
      url = new URL(`${BASE_URL}/games`);

      url.searchParams.set('key', RAWG_API_KEY);
      url.searchParams.set('search', q);
      url.searchParams.set('page_size', '20');

    } else {
      return res.status(400).json({
        error: 'Missing q or id'
      });
    }

    const response = await fetchRAWG(url);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `RAWG ${response.status}`
      });
    }

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {

    // RAWG не ответил за 3.5 секунды
    if (error?.name === 'AbortError') {
      console.warn('[rawg] request timed out');

      return res.status(504).json({
        error: 'RAWG request timed out'
      });
    }

    console.error('[rawg] request failed', error);

    return res.status(502).json({
      error: 'RAWG unavailable'
    });
  }
}