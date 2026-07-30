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
        error: 'Missing q or id'
      });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `RAWG ${response.status}`
      });
    }

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: 'Internal server error'
    });
  }
}