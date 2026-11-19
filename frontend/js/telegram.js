
const tg = window.Telegram?.WebApp || null;

const MODAL_SELECTORS = [
  '#modal-overlay',
  '#auth-overlay',
  '#auth-modal',
  '#diagnostics-overlay',
];

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

  const diagnostics = document.getElementById(
    'diagnostics-overlay'
  );

  if (diagnostics && !diagnostics.hidden) {
    diagnostics.hidden = true;
    return;
  }

  const auth = document.getElementById('auth-overlay');

  if (auth && !auth.hidden) {
    auth.hidden = true;
    return;
  }

  const account = document.getElementById('auth-modal');

  if (account && !account.hidden) {
    account.hidden = true;
  }
}

function updateBackButton() {
  if (!tg?.BackButton) {
    return;
  }

  if (isModalOpen()) {
    tg.BackButton.show();
  } else {
    tg.BackButton.hide();
  }
}

function updateViewport() {
  if (!tg) {
    return;
  }

  const height =
    tg.viewportStableHeight ||
    tg.viewportHeight ||
    window.innerHeight;

  document.documentElement.style.setProperty(
    '--telegram-viewport-height',
    `${height}px`
  );
}

export function initTelegramApp() {
  if (!tg) {
    document.documentElement.classList.add(
      'browser-mode'
    );

    return;
  }

  document.documentElement.classList.add(
    'telegram-mini-app'
  );

  tg.ready();
  tg.expand();

  try {
    tg.setHeaderColor('#14181f');
    tg.setBackgroundColor('#14181f');
  } catch (error) {
    console.warn('[telegram] Theme setup failed:', error);
  }

  updateViewport();

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

  updateBackButton();

  console.log('[telegram] Mini App initialized');
}
