import { initHomePage } from './home.js';
import { initAuthUI } from './auth.js';

document.addEventListener(
  'DOMContentLoaded',
  async () => {
    await initAuthUI();
    initHomePage();
  }
);