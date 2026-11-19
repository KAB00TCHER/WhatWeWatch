
const SUPABASE_URL =
  'https://ppakdykkaocmvfncabun.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_pi8y8cdWltiYD8SIrHJ2cQ_LZ9e_Aao';

const MAX_INIT_DATA_AGE = 600;

function sendError(res, status, error) {
  return res.status(status).json({ error });
}

async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      data
    )
  );
}

function toHex(bytes) {
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;

  let difference = 0;

  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return difference === 0;
}

async function validateTelegramInitData(initData) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error('Telegram server configuration error');
  }

  if (
    typeof initData !== 'string' ||
    !initData ||
    initData.length > 16000
  ) {
    throw new Error('Invalid Telegram initData');
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');

  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
    throw new Error('Invalid Telegram signature');
  }

  const authDate = Number(params.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);

  if (
    !Number.isInteger(authDate) ||
    authDate > now + 60 ||
    now - authDate > MAX_INIT_DATA_AGE
  ) {
    throw new Error('Telegram session expired. Reopen the Mini App.');
  }

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const encoder = new TextEncoder();

  const secretKey = await hmac(
    encoder.encode('WebAppData'),
    encoder.encode(botToken)
  );

  const calculatedHash = toHex(
    await hmac(
      secretKey,
      encoder.encode(dataCheckString)
    )
  );

  if (!safeEqual(calculatedHash, receivedHash.toLowerCase())) {
    throw new Error('Invalid Telegram signature');
  }

  let telegramUser;

  try {
    telegramUser = JSON.parse(params.get('user') || '');
  } catch {
    throw new Error('Invalid Telegram user data');
  }

  if (
    !telegramUser ||
    !Number.isSafeInteger(telegramUser.id) ||
    telegramUser.id <= 0
  ) {
    throw new Error('Telegram user not found');
  }

  return telegramUser;
}

async function getSupabaseUser(accessToken) {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/user`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function databaseRequest(path, options = {}) {
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error('Database server configuration error');
  }

  return fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        apikey: secretKey,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed');
  }

  try {
    const authorization = req.headers.authorization || '';
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!accessToken) {
      return sendError(res, 401, 'Supabase session required');
    }

    const supabaseUser = await getSupabaseUser(accessToken);

    if (!supabaseUser?.id) {
      return sendError(res, 401, 'Invalid Supabase session');
    }

    const body = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;

    const telegramUser = await validateTelegramInitData(
      body?.initData
    );

    const telegramId = String(telegramUser.id);
    const userId = supabaseUser.id;

    // Проверяем, не привязан ли Telegram к другому аккаунту.
    const telegramCheck = await databaseRequest(
      `telegram_accounts?select=telegram_id,user_id&telegram_id=eq.${telegramId}`
    );

    if (!telegramCheck.ok) {
      console.error('[telegram-link] Telegram lookup failed');
      return sendError(res, 500, 'Database lookup failed');
    }

    const telegramRows = await telegramCheck.json();

    if (telegramRows.length > 0) {
      if (telegramRows[0].user_id === userId) {
        return res.status(200).json({
          success: true,
          alreadyLinked: true,
        });
      }

      return sendError(
        res,
        409,
        'Этот Telegram уже привязан к другому аккаунту.'
      );
    }

    // Проверяем, не привязан ли к аккаунту другой Telegram.
    const accountCheck = await databaseRequest(
      `telegram_accounts?select=telegram_id,user_id&user_id=eq.${encodeURIComponent(userId)}`
    );

    if (!accountCheck.ok) {
      console.error('[telegram-link] Account lookup failed');
      return sendError(res, 500, 'Database lookup failed');
    }

    const accountRows = await accountCheck.json();

    if (accountRows.length > 0) {
      return sendError(
        res,
        409,
        'К этому аккаунту уже привязан другой Telegram.'
      );
    }

    // Создаём привязку. Ограничения UNIQUE в БД защищают
    // от одновременной привязки к разным аккаунтам.
    const insertResponse = await databaseRequest(
      'telegram_accounts',
      {
        method: 'POST',
        headers: {
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          telegram_id: telegramId,
          user_id: userId,
          username: telegramUser.username || null,
          first_name: telegramUser.first_name || null,
        }),
      }
    );

    if (insertResponse.status === 409) {
      return sendError(
        res,
        409,
        'Telegram или аккаунт уже привязан.'
      );
    }

    if (!insertResponse.ok) {
      console.error(
        '[telegram-link] Insert failed:',
        insertResponse.status,
        await insertResponse.text()
      );

      return sendError(res, 500, 'Could not link Telegram account');
    }

    return res.status(200).json({
      success: true,
      alreadyLinked: false,
      telegram: {
        id: telegramId,
        username: telegramUser.username || null,
        firstName: telegramUser.first_name || null,
      },
    });

  } catch (error) {
    console.error('[telegram-link] Error:', error);

    const message = error?.message || '';

    if (
      message.includes('Telegram signature') ||
      message.includes('Telegram initData') ||
      message.includes('Telegram user') ||
      message.includes('Telegram session')
    ) {
      return sendError(res, 401, message);
    }

    return sendError(res, 500, 'Internal server error');
  }
}
