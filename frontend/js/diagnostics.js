
import {
  getCurrentUser,
  supabaseRequest,
} from './supabase.js';

import {
  checkTMDBConnection,
} from './tmdb.js';

let elements = null;
let lastReport = '';

function getElements() {
  if (elements) {
    return elements;
  }

  elements = {
    buttons: document.querySelectorAll(
      '.diagnostics-open-button'
    ),
    overlay: document.getElementById('diagnostics-overlay'),
    close: document.getElementById('diagnostics-close'),
    run: document.getElementById('diagnostics-run'),
    copy: document.getElementById('diagnostics-copy'),
    results: document.getElementById('diagnostics-results'),
    summary: document.getElementById('diagnostics-summary'),
  };

  return elements;
}

function setResult(name, status, details = '') {
  const results = getElements().results;

  let row = [...results.children].find(
    element => element.dataset.name === name
  );

  if (!row) {
    row = document.createElement('div');
    row.dataset.name = name;
    results.appendChild(row);
  }

  row.className = `diagnostic-row diagnostic-row--${status}`;
  row.innerHTML = '';

  const info = document.createElement('div');
  info.className = 'diagnostic-row__info';

  const title = document.createElement('strong');
  title.textContent = name;

  const description = document.createElement('span');
  description.textContent = details;

  info.append(title, description);

  const badge = document.createElement('span');
  badge.className = 'diagnostic-row__status';

  const labels = {
    success: 'Успешно',
    error: 'Ошибка',
    skipped: 'Пропущено',
    checking: 'Проверка...',
  };

  badge.textContent = labels[status] || status;

  row.append(info, badge);
}

function makeTimeout(ms = 10000) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    ms
  );

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}


async function checkTMDB() {
  const timeout = makeTimeout(12000);

  try {
    return await checkTMDBConnection(timeout.signal);
  } finally {
    timeout.clear();
  }
}


async function checkProxyProvider(
  name,
  endpoint,
  params,
  resultKey
) {
  const timeout = makeTimeout(12000);

  try {
    const query = new URLSearchParams(params);

    const response = await fetch(
      `${endpoint}?${query}`,
      {
        method: 'GET',
        signal: timeout.signal,
      }
    );

    if (!response.ok) {
      throw new Error(
        `${name} ответил HTTP ${response.status}.`
      );
    }

    const data = await response.json();

    const items = resultKey
      ? data?.[resultKey]
      : data;

    if (!Array.isArray(items)) {
      throw new Error(
        `${name} вернул неожиданный формат ответа.`
      );
    }

    if (!items.length) {
      throw new Error(
        `${name} ответил, но тестовый поиск не вернул результатов.`
      );
    }

    return `API отвечает. Тестовый поиск вернул результатов: ${items.length}.`;
  } finally {
    timeout.clear();
  }
}


function checkShikimori() {
  return checkProxyProvider(
    'Shikimori',
    '/api/shikimori',
    { q: 'Naruto' },
    null
  );
}


function checkRAWG() {
  return checkProxyProvider(
    'RAWG',
    '/api/rawg',
    { q: 'Portal 2' },
    'results'
  );
}


function checkSteam() {
  return checkProxyProvider(
    'Steam',
    '/api/steam',
    { q: 'Portal 2' },
    'items'
  );
}

async function checkInternet() {
  if (!navigator.onLine) {
    throw new Error('Устройство сообщает об отсутствии подключения к сети.');
  }

  return 'Браузер сообщает, что подключение к сети активно.';
}

async function checkSupabase() {
  const timeout = makeTimeout();

  try {
    const response = await fetch(
      'https://ppakdykkaocmvfncabun.supabase.co/auth/v1/health',
      {
        method: 'GET',
        headers: {
          apikey: 'sb_publishable_pi8y8cdWltiYD8SIrHJ2cQ_LZ9e_Aao',
        },
        signal: timeout.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`Сервер ответил HTTP ${response.status}.`);
    }

    return 'Сервер Supabase отвечает.';
  } finally {
    timeout.clear();
  }
}

async function checkAuth() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authenticated: false,
      details: 'Пользователь не авторизован.',
    };
  }

  return {
    authenticated: true,
    details: 'Сессия активна. Пользователь авторизован.',
  };
}

async function checkDatabase() {
  const data = await supabaseRequest(
    'library_items?select=id&limit=1',
    {
      method: 'GET',
    }
  );

  if (!Array.isArray(data)) {
    throw new Error('База вернула неожиданный формат ответа.');
  }

  return `Запрос SELECT выполнен. Получено строк: ${data.length}.`;
}

function getPlatform() {
  const tg = window.Telegram?.WebApp;

  if (tg?.platform) {
    return `Telegram (${tg.platform})`;
  }

  return 'Обычный браузер';
}

function formatDate(date) {
  return date.toLocaleString('ru-RU');
}

function buildReport(results) {
  const lines = [
    'WhatWeWatch — диагностический отчёт',
    `Время: ${formatDate(new Date())}`,
    `Платформа: ${getPlatform()}`,
    `Версия приложения: ${document.title}`,
    '',
    ...results.map(item =>
      `${item.name}: ${item.status.toUpperCase()} — ${item.details}`
    ),
  ];

  return lines.join('\n');
}

async function runDiagnostics() {
  const els = getElements();

  els.run.disabled = true;
  els.copy.disabled = true;
  els.results.innerHTML = '';
  els.summary.textContent = 'Выполняем проверки...';

  const results = [];

  const run = async (name, callback) => {
    setResult(name, 'checking');

    try {
      const value = await callback();

      const details =
        typeof value === 'string'
          ? value
          : value.details;

      const result = {
        name,
        status: 'success',
        details,
      };

      results.push(result);
      setResult(name, 'success', details);

      return value;
    } catch (error) {
      const details = error.name === 'AbortError'
        ? 'Превышено время ожидания ответа.'
        : error.message || 'Неизвестная ошибка.';

      results.push({
        name,
        status: 'error',
        details,
      });

      setResult(name, 'error', details);

      return null;
    }
  };

  const skip = (name, details) => {
    results.push({
      name,
      status: 'skipped',
      details,
    });

    setResult(name, 'skipped', details);
  };

  const telegram = window.Telegram?.WebApp;

  if (telegram) {
    results.push({
      name: 'Telegram SDK',
      status: 'success',
      details: `SDK доступен. Платформа: ${telegram.platform || 'не определена'}.`,
    });

    setResult(
      'Telegram SDK',
      'success',
      `Платформа: ${telegram.platform || 'не определена'}.`
    );
  } else {
    results.push({
      name: 'Telegram SDK',
      status: 'skipped',
      details: 'Приложение открыто вне Telegram.',
    });

    setResult(
      'Telegram SDK',
      'skipped',
      'Приложение открыто вне Telegram.'
    );
  }

  await run('Интернет', checkInternet);
  await run('Supabase Auth / сервер', checkSupabase);

  const auth = await run('Авторизация', checkAuth);

  if (auth?.authenticated) {
    await run('База данных / library_items', checkDatabase);
  } else if (auth) {
    skip(
      'База данных / library_items',
      'Войдите в аккаунт, чтобы проверить чтение библиотеки.'
    );
  } else {
    skip(
      'База данных / library_items',
      'Проверка пропущена: не удалось определить состояние авторизации.'
    );
  }

    await run('TMDB', checkTMDB);
  await run('Shikimori', checkShikimori);
  await run('RAWG', checkRAWG);
  await run('Steam', checkSteam);

  const errors = results.filter(
    item => item.status === 'error'
  ).length;

  const skipped = results.filter(
    item => item.status === 'skipped'
  ).length;

  els.summary.textContent = errors
    ? `Обнаружено ошибок: ${errors}. Пропущено проверок: ${skipped}.`
    : `Ошибок не обнаружено. Пропущено проверок: ${skipped}.`;

  lastReport = buildReport(results);

  els.run.disabled = false;
  els.copy.disabled = false;
}

async function copyReport() {
  if (!lastReport) {
    return;
  }

  try {
    await navigator.clipboard.writeText(lastReport);
    getElements().copy.textContent = 'Скопировано';
  } catch {
    const textarea = document.createElement('textarea');

    textarea.value = lastReport;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand('copy');

    textarea.remove();

    getElements().copy.textContent = copied
      ? 'Скопировано'
      : 'Не удалось скопировать';
  }

  setTimeout(() => {
    getElements().copy.textContent = 'Скопировать отчёт';
  }, 2000);
}

export function initDiagnostics() {
  const els = getElements();

if (
  !els.buttons.length ||
  !els.overlay ||
  !els.close ||
  !els.run ||
  !els.copy
) {
    console.error('[diagnostics] Required elements not found.');
    return;
  }

els.buttons.forEach(button => {
  button.addEventListener('click', () => {
    els.overlay.hidden = false;
  });
});

  els.close.addEventListener('click', () => {
    els.overlay.hidden = true;
  });

  els.overlay.addEventListener('click', event => {
    if (event.target === els.overlay) {
      els.overlay.hidden = true;
    }
  });

  els.run.addEventListener('click', runDiagnostics);
  els.copy.addEventListener('click', copyReport);
}
