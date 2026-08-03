const RAWG_API_KEY = '824826cafeb541228ca96281cfb4f0d3';

const BASE_URL = 'https://api.rawg.io/api';

export default async function handler(req, res) {
  try {
    const { q, id } = req.query;

    let url;

    if (id) {
      url = new URL(`${BASE_URL}/games/${id}`);
      url.searchParams.set('key', RAWG_API_KEY);
    } else if (q) {
      url = new URL(`${BASE_URL}/games`);
      url.searchParams.set('key', RAWG_API_KEY);
      url.searchParams.set('search', q);
      url.searchParams.set('page_size', '20');
    } else {
      return res.status(400).json({
        error: 'Missing q or id',
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    let response;

    try {
      response = await fetch(url, {
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        return res.status(503).json({
          error: 'GAME_DATABASE_UNAVAILABLE',
        });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // Любая ошибка сервера RAWG (500, 502, 520, 522, 524...)
      if (response.status >= 500) {
        return res.status(503).json({
          error: 'GAME_DATABASE_UNAVAILABLE',
        });
      }

      // Остальные ошибки (401, 404 и т.п.)
      return res.status(response.status).json({
        error: `RAWG ${response.status}`,
      });
    }

    const data = await response.json();

    return res.status(200).json(data);

  } catch (error) {
    console.error('[RAWG API]', error);

    return res.status(503).json({
      error: 'GAME_DATABASE_UNAVAILABLE',
    });
  }
}