
import { initHomePage } from './home.js';
import { initAuthUI } from './auth.js';
import { initTelegramApp } from './telegram.js';
import { initDiagnostics } from './diagnostics.js';

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    initTelegramApp();
    initDiagnostics();

    await initAuthUI();
    initHomePage();
  }
);
