
const tg = window.Telegram?.WebApp || null;

const MODAL_SELECTORS = [
  '#modal-overlay',
  '#auth-overlay',
  '#auth-modal',
  '#diagnostics-overlay',
];

const DEFAULT_THEME = {
  bg_color: '#14181f',
  secondary_bg_color: '#1c212b',
  text_color: '#eef1f6',
  hint_color: '#8b93a3',
  button_color: '#e2a33d',
  button_text_color: '#1a1204',
  destructive_text_color: '#d9636c',
  section_bg_color: '#1c212b',
  subtitle_text_color: '#8b93a3',
  accent_text_color: '#e2a33d',
};

function isModalOpen() {
  return MODAL_SELECTORS.some(selector => {
    const element = document.querySelector(selector);
    return element && !element.hidden;
  });
}

function closeCurrentModal() {
  const detailClose = document.querySelector(
    '#modal-overlay [data-action="close"]'
  );

  if (
    detailClose &&
    !document.getElementById('modal-overlay')?.hidden
  ) {
    detailClose.click();
    return;
  }

  for (const id of [
    'diagnostics-overlay',
    'auth-overlay',
    'auth-modal',
  ]) {
    const element = document.getElementById(id);

    if (element && !element.hidden) {
      element.hidden = true;
      return;
    }
  }
}

function updateBackButton() {
  if (!tg?.BackButton) return;

  if (isModalOpen()) {
    tg.BackButton.show();
  } else {
    tg.BackButton.hide();
  }
}

function updateViewport() {
  if (!tg) return;

  const height = tg.viewportHeight || window.innerHeight;
  const stableHeight =
    tg.viewportStableHeight || height;

  document.documentElement.style.setProperty(
    '--telegram-viewport-height',
    `${height}px`
  );

  document.documentElement.style.setProperty(
    '--telegram-viewport-stable-height',
    `${stableHeight}px`
  );
}

function updateTheme() {
  if (!tg) return;

  const params = {
    ...DEFAULT_THEME,
    ...(tg.themeParams || {}),
  };

  const root = document.documentElement;

  root.style.setProperty('--color-bg', params.bg_color);
  root.style.setProperty(
    '--color-surface',
    params.secondary_bg_color
  );
  root.style.setProperty(
    '--color-surface-2',
    params.section_bg_color
  );
  root.style.setProperty('--color-text', params.text_color);
  root.style.setProperty(
    '--color-text-muted',
    params.hint_color
  );
  root.style.setProperty(
    '--color-accent',
    params.button_color
  );
  root.style.setProperty(
    '--color-accent-hover',
    params.accent_text_color
  );
  root.style.setProperty(
    '--color-danger',
    params.destructive_text_color
  );

  root.dataset.telegramTheme = tg.colorScheme || 'dark';

  try {
    tg.setHeaderColor(params.bg_color);
    tg.setBackgroundColor(params.bg_color);
  } catch (error) {
    console.warn('[telegram] Theme update failed:', error);
  }
}

export function initTelegramApp() {
  if (!tg) {
    document.documentElement.classList.add('browser-mode');
    return;
  }

  document.documentElement.classList.add('telegram-mini-app');

  tg.ready();
  tg.expand();

  updateTheme();
  updateViewport();

  tg.onEvent('themeChanged', updateTheme);
  tg.onEvent('viewportChanged', updateViewport);

  tg.BackButton.onClick(closeCurrentModal);

  const observer = new MutationObserver(updateBackButton);

  MODAL_SELECTORS.forEach(selector => {
    const element = document.querySelector(selector);

    if (element) {
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['hidden'],
      });
    }
  });

  window.addEventListener('resize', updateViewport);

  updateBackButton();

  console.log('[telegram] Mini App initialized');
}
