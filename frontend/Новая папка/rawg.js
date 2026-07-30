const RAWG_API_KEY = '824826cafeb541228ca96281cfb4f0d3';

const BASE_URL = 'https://api.rawg.io/api';

export default async function handler(req, res) {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Missing query'
      });
    }

    const url = new URL(`${BASE_URL}/games`);

    url.searchParams.set('key', RAWG_API_KEY);
    url.searchParams.set('search', q);
    url.searchParams.set('page_size', '20');

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `RAWG error ${response.status}`
      });
    }

    const data = await response.json();

    res.status(200).json(data);

  } catch (error) {
    console.error('[api/rawg]', error);

    res.status(500).json({
      error: 'Server error'
    });
  }
}


whatwewatch-three.vercel.app/api/rawg?q=minecraft  выдал ошибку 404 почему то. При этом если я прям в поиске пишу майнкрафт, то находит и игры и фильмы как надо.  При этом если я пытаюсь добавить к себе карточку с игрой, сайт долго "что то грузит" как при поиске, когда было на локалке, а потом открывает карточку но без описания (возможно не может подтянуть из за разницы в форматах или типа того.)
ВНЕЗАПНО ПЕРЕСТАЛО РАБОТАТЬ РАВГ, снова выдает CORS. теперь по поводу консоли: при загрузке сайта сразу выдает вот это: [rawg] search error TypeError: NetworkError when attempting to fetch resource. rawg.js:72:13
[shikimori] search error TypeError: NetworkError when attempting to fetch resource. shikimori.js:58:13
а при поиске чего либо снова те же ошибки:
XHR 
GET
https://api.allorigins.win/raw?url=https://shikimori.one/api/animes?search=%D0%A4%D1%80%D0%B8%D1%80%D0%B5%D0%BD&limit=20
CORS Missing Allow Origin
XHR 
GET
https://api.allorigins.win/raw?url=https://api.rawg.io/api/games?key=824826cafeb541228ca96281cfb4f0d3&search=%D0%A4%D1%80%D0%B8%D1%80%D0%B5%D0%BD&page_size=20
CORS Missing Allow Origin
Запрос из постороннего источника заблокирован: Политика одного источника запрещает чтение удалённого ресурса на https://api.allorigins.win/raw?url=https%3A%2F%2Fapi.rawg.io%2Fapi%2Fgames%3Fkey%3D824826cafeb541228ca96281cfb4f0d3%26search%3D%25D0%25A4%25D1%2580%25D0%25B8%25D1%2580%25D0%25B5%25D0%25BD%26page_size%3D20. (Причина: отсутствует заголовок CORS «Access-Control-Allow-Origin»). Код состояния: 522.
[rawg] search error TypeError: NetworkError when attempting to fetch resource. rawg.js:72:13
Запрос из постороннего источника заблокирован: Политика одного источника запрещает чтение удалённого ресурса на https://api.allorigins.win/raw?url=https%3A%2F%2Fshikimori.one%2Fapi%2Fanimes%3Fsearch%3D%25D0%25A4%25D1%2580%25D0%25B8%25D1%2580%25D0%25B5%25D0%25BD%26limit%3D20. (Причина: отсутствует заголовок CORS «Access-Control-Allow-Origin»). Код состояния: 522.
[shikimori] search error TypeError: NetworkError when attempting to fetch resource. shikimori.js:58:13

Давай исправлять, мне надоело тыкаться
