// js/supabase.js

const SUPABASE_URL = 'https://ppakdykkaocmvfncabun.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_pi8y8cdWltiYD8SIrHJ2cQ_LZ9e_Aao';

const AUTH_URL = `${SUPABASE_URL}/auth/v1`;

function authHeaders(accessToken = null) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${AUTH_URL}${path}`, {
    ...options,
    headers: {
      ...authHeaders(options.accessToken),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.msg ||
      data?.message ||
      data?.error_description ||
      data?.error ||
      `Supabase Auth error ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export async function signUp(email, password, username = '') {
  const data = await authRequest('/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,

      data: {
        username: username || null,
      },
    }),
  });

  if (data?.access_token) {
    localStorage.setItem(
      'whatwewatch:session',
      JSON.stringify(data)
    );
  }

  return data;
}

export async function getEmailByUsername(username) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/get_email_by_username`,
    {
      method: 'POST',

      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        p_username: username.trim(),
      }),
    }
  );

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Supabase ${response.status}: ${text}`
    );
  }

  return data;
}

export async function signIn(identifier, password) {
  let email = identifier.trim();

  /*
   * Если пользователь ввёл не email,
   * считаем, что это никнейм.
   */
  if (!email.includes('@')) {
    const foundEmail =
      await getEmailByUsername(email);

    if (!foundEmail) {
      throw new Error(
        'Пользователь с таким никнеймом не найден.'
      );
    }

    email = foundEmail;
  }

  const data = await authRequest(
    '/token?grant_type=password',
    {
      method: 'POST',

      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  if (data?.access_token) {
    localStorage.setItem(
      'whatwewatch:session',
      JSON.stringify(data)
    );
  }

  return data;
}

export async function signOut() {
  const session = getSession();

  if (session?.access_token) {
    try {
      await authRequest('/logout', {
        method: 'POST',
        accessToken: session.access_token,
      });
    } catch (err) {
      console.warn('[auth] logout request failed', err);
    }
  }

  localStorage.removeItem('whatwewatch:session');
}

export function getSession() {
  try {
    const raw = localStorage.getItem('whatwewatch:session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return getSession()?.access_token || null;
}

export async function getCurrentUser() {
  const token = getAccessToken();

  if (!token) return null;

  try {
    return await authRequest('/user', {
      method: 'GET',
      accessToken: token,
    });
  } catch (err) {
    console.warn('[auth] session is invalid:', err);
    localStorage.removeItem('whatwewatch:session');
    return null;
  }
}

export async function supabaseRequest(path, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,

      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `Supabase ${response.status}: ${text}`
    );
  }

  return data;
}

export async function getProfile(userId) {
  const data = await supabaseRequest(
    `profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,username`,
    {
      method: 'GET',
    }
  );

  return data?.[0] || null;
}