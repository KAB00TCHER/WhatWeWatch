// js/home.js
// Page logic. This is the only file that knows about api.js, storage.js,
// AND ui.js at the same time — it wires the search bar, type filters,
// library grid, and detail modal together. It touches the DOM only to grab
// element references; all rendering is delegated to ui.js.

import { searchAll, enrichDetails } from './api.js';
import * as storage from './storage.js';
import * as ui from './ui.js';

const activeTypes = new Set();

let currentView = 'library'; // 'library' | 'search'

let currentSearchResults = [];

let librarySort = 'added-desc';

let libraryView = 'cards';


let els = null;

let loadingTimer1 = null;
let loadingTimer2 = null;

let isSearching = false;

let loadingStartedAt = 0;


// =========================================================
// DOM
// =========================================================

function getEls() {
  if (els) return els;

  els = {
    searchForm:
      document.getElementById('search-form'),

    searchInput:
      document.getElementById('search-input'),

    searchButton:
      document.querySelector(
        '#search-form button[type="submit"]'
      ),

    typeFilters:
      document.getElementById('type-filters'),

    resultsSection:
      document.getElementById('results-section'),

    resultsGrid:
      document.getElementById('results-grid'),

    libraryGrid:
      document.getElementById('library-grid'),

    libraryStats:
  document.getElementById('library-stats'),

    librarySort:
      document.getElementById('library-sort'),

    randomPicker:
      document.getElementById('random-picker'),

    viewSwitcher:
      document.querySelector('.view-switcher'),

    clearSearch:
      document.getElementById('clear-search'),

    modalOverlay:
      document.getElementById('modal-overlay'),

    modal:
      document.getElementById('modal'),

    loadingOverlay:
      document.getElementById('loading-overlay'),

    loadingText:
      document.getElementById('loading-text'),
  };

  return els;
}


// =========================================================
// LOADING
// =========================================================

function showLoading() {
  const {
    loadingOverlay,
    loadingText,
    searchInput,
    searchButton,
  } = getEls();


  isSearching = true;

  loadingStartedAt =
    Date.now();


  loadingOverlay.hidden =
    false;


  searchInput.disabled =
    true;


  searchButton.disabled =
    true;

  searchButton.dataset.originalText =
    searchButton.textContent;

  searchButton.textContent =
    'Поиск...';


  loadingText.textContent =
    'Подбираем результаты из всех доступных баз данных';


  clearTimeout(
    loadingTimer1
  );

  clearTimeout(
    loadingTimer2
  );


  loadingTimer1 =
    setTimeout(() => {

      loadingText.textContent =
        'Это может занять немного больше времени...';

    }, 3000);


  loadingTimer2 =
    setTimeout(() => {

      loadingText.textContent =
        'Почти готово...';

    }, 8000);
}


async function hideLoading() {
  const {
    loadingOverlay,
    searchInput,
    searchButton,
  } = getEls();


  const elapsed =
    Date.now() -
    loadingStartedAt;


  const remaining =
    Math.max(
      0,
      1000 - elapsed
    );


  if (remaining > 0) {

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          remaining
        )
    );
  }


  isSearching =
    false;


  clearTimeout(
    loadingTimer1
  );

  clearTimeout(
    loadingTimer2
  );


  loadingOverlay.hidden =
    true;


  searchInput.disabled =
    false;


  searchButton.disabled =
    false;


  searchButton.textContent =
    searchButton.dataset.originalText ||
    'Search';


  searchInput.focus();
}


// =========================================================
// FILTERS
// =========================================================

function filterResults(items) {

  if (activeTypes.size === 0) {
    return items;
  }


  return items.filter(
    item =>
      activeTypes.has(
        item.type
      )
  );
}


function sortLibrary(items) {
  const sorted = [...items];

  const compareStrings = (a, b) =>
    String(a || '').localeCompare(
      String(b || ''),
      'ru',
      { sensitivity: 'base' }
    );

  const compareNumbers = (a, b) => {
    const numA = Number(a);
    const numB = Number(b);

    if (Number.isNaN(numA) && Number.isNaN(numB)) return 0;
    if (Number.isNaN(numA)) return 1;
    if (Number.isNaN(numB)) return -1;

    return numA - numB;
  };

  switch (librarySort) {
    case 'updated-desc':
      return sorted.sort(
        (a, b) =>
          new Date(b.updatedAt || 0) -
          new Date(a.updatedAt || 0)
      );

    case 'title-asc':
      return sorted.sort((a, b) =>
        compareStrings(a.title, b.title)
      );

    case 'title-desc':
      return sorted.sort((a, b) =>
        compareStrings(b.title, a.title)
      );

    case 'year-desc':
      return sorted.sort(
        (a, b) =>
          compareNumbers(b.year, a.year)
      );

    case 'year-asc':
      return sorted.sort(
        (a, b) =>
          compareNumbers(a.year, b.year)
      );

    case 'user-rating-desc':
      return sorted.sort(
        (a, b) =>
          compareNumbers(b.userRating, a.userRating)
      );

    case 'external-rating-desc':
      return sorted.sort(
        (a, b) =>
          compareNumbers(b.rating, a.rating)
      );

    case 'added-desc':
    default:
      return sorted.sort(
        (a, b) =>
          new Date(b.addedAt || 0) -
          new Date(a.addedAt || 0)
      );
  }
}

// =========================================================
// LIBRARY
// =========================================================

async function getLibraryView() {

  try {

    return await storage.getLibraryWithDetails();

  } catch (error) {

    console.error(
      '[library] failed to load library:',
      error
    );

    return [];
  }
}


// =========================================================
// RENDER
// =========================================================

async function render() {

  const {
    resultsSection,
    resultsGrid,
    libraryGrid,
  } = getEls();


  // -----------------------------------------
  // Search results
  // -----------------------------------------

  if (
    currentView === 'search'
  ) {

    resultsSection.hidden =
      false;


    ui.renderGrid(
      resultsGrid,

      filterResults(
        currentSearchResults
      ),

      {
        onSelect:
          openDetail,
      }
    );

  } else {

    resultsSection.hidden =
      true;
  }


  // -----------------------------------------
  // User library
  // -----------------------------------------

const library =
  await getLibraryView();

const filteredLibrary =
  filterResults(library);

const sortedLibrary =
  sortLibrary(filteredLibrary);

const {
  libraryStats,
} = getEls();

ui.renderStats(
  libraryStats,
  library
);

if (libraryView === 'list') {
  ui.renderList(
    libraryGrid,
    sortedLibrary,
    {
      onSelect: openDetail,
    }
  );
} else {
  ui.renderGrid(
    libraryGrid,
    sortedLibrary,
    {
      onSelect: openDetail,
    }
  );
}
}


// =========================================================
// DETAIL MODAL
// =========================================================

async function openDetail(item) {

  const {
    modalOverlay,
    modal,
  } = getEls();


  let record = null;


  try {

    record =
      await storage.getLibraryRecord(
        item.id,
        item.provider
      );

  } catch (error) {

    console.error(
      '[library] failed to get record:',
      error
    );
  }


  // Library items already have their
  // media information cached.
  //
  // A fresh search result needs enrichment.

  const fullItem =
    record
      ? item
      : await enrichDetails(item);


  ui.openModal(
    modalOverlay,
    modal,
    {
      item: fullItem,

      record,


      // -------------------------------------
      // ADD
      // -------------------------------------

      onAdd: async (changes) => {

        try {

          if (record) {
            await storage.updateLibraryRecord(
              fullItem.id,
              fullItem.provider,
              changes
            );
          } else {
            await storage.addToLibrary(
              fullItem,
              changes
            );
          }

          await render();

        } catch (error) {

          console.error(
            '[library] failed to save item:',
            error
          );

          alert(
            error.message ||
            'Не удалось сохранить изменения.'
          );
        }
      },


      // -------------------------------------
      // SAVE
      // -------------------------------------

      onSave: async (changes) => {

        try {

          await storage.updateLibraryRecord(
            fullItem.id,
            fullItem.provider,
            changes
          );


          await render();

        } catch (error) {

          console.error(
            '[library] failed to update item:',
            error
          );


          alert(
            error.message ||
            'Не удалось сохранить изменения.'
          );
        }
      },


      // -------------------------------------
      // REMOVE
      // -------------------------------------

      onRemove: async () => {

        try {

          await storage.removeFromLibrary(
            fullItem.id,
            fullItem.provider
          );


          await render();

        } catch (error) {

          console.error(
            '[library] failed to remove item:',
            error
          );


          alert(
            error.message ||
            'Не удалось удалить элемент из библиотеки.'
          );
        }
      },
    }
  );
}


// =========================================================
// INITIALIZATION
// =========================================================

export function initHomePage() {

const {
  searchForm,
  searchInput,
  typeFilters,
  clearSearch,
  librarySort: librarySortSelect,
  randomPicker,
  viewSwitcher,
} = getEls();

  window.addEventListener(
  'authchange',
  async () => {

    currentView = 'library';

    currentSearchResults = [];

    await render();
  }
);


  // =======================================================
  // SEARCH
  // =======================================================

  searchForm.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();


      if (isSearching) {
        return;
      }


      const query =
        searchInput.value.trim();


      if (!query) {
        return;
      }


      showLoading();


      try {

        currentSearchResults =
          await searchAll(
            query,
            activeTypes
          );


        currentView =
          'search';


        await render();

      } catch (error) {

        console.error(
          '[search] failed:',
          error
        );

      } finally {

        await hideLoading();
      }
    }
  );


  // =======================================================
  // CLEAR SEARCH
  // =======================================================

  clearSearch.addEventListener(
    'click',
    async () => {

      currentView =
        'library';

      currentSearchResults =
        [];

      searchInput.value =
        '';


      await render();
    }
  );


  // =======================================================
  // TYPE FILTERS
  // =======================================================

  typeFilters.addEventListener(
    'click',
    async (e) => {

      const btn =
        e.target.closest(
          '.type-filter'
        );


      if (
        !btn ||
        isSearching
      ) {
        return;
      }


      const type =
        btn.dataset.type;


      if (
        activeTypes.has(type)
      ) {

        activeTypes.delete(
          type
        );

        btn.classList.remove(
          'is-active'
        );

      } else {

        activeTypes.add(
          type
        );

        btn.classList.add(
          'is-active'
        );
      }


      await render();
    }
  );


  // =======================================================
// LIBRARY SORT
// =======================================================

librarySortSelect.addEventListener(
  'change',
  async () => {
    librarySort = librarySortSelect.value;
    await render();
  }
);


// =======================================================
// LIBRARY VIEW
// =======================================================

viewSwitcher.addEventListener(
  'click',
  async (e) => {
    const button =
      e.target.closest(
        '.view-switcher__button'
      );

    if (!button) {
      return;
    }

    const view =
      button.dataset.view;

    if (
      view !== 'cards' &&
      view !== 'list'
    ) {
      return;
    }

    libraryView = view;

    viewSwitcher
      .querySelectorAll(
        '.view-switcher__button'
      )
      .forEach((btn) => {
        btn.classList.toggle(
          'is-active',
          btn === button
        );
      });

    await render();
  }
);


// =======================================================
// RANDOM PICKER
// =======================================================

randomPicker.addEventListener(
  'click',
  async () => {

    if (isSearching) {
      return;
    }

    const library =
      await getLibraryView();

    const candidates =
      filterResults(library)
        .filter(
          item =>
            item.status === 'planned' ||
            item.status === 'on_hold'
        );

    if (!candidates.length) {
      alert(
        'В запланированном и поставленном на паузу пока ничего нет.'
      );

      return;
    }

    let currentItem =
      candidates[
        Math.floor(
          Math.random() *
          candidates.length
        )
      ];

    const {
      modalOverlay,
      modal,
    } = getEls();

    const showRandom =
      () => {

        ui.openRandomChoice(
          modalOverlay,
          modal,
          currentItem,
          {
            onOpen:
              openDetail,

            onAgain:
              () => {

                if (
                  candidates.length === 1
                ) {
                  return;
                }

                const available =
                  candidates.filter(
                    item =>
                      item.id !==
                      currentItem.id
                  );

                currentItem =
                  available[
                    Math.floor(
                      Math.random() *
                      available.length
                    )
                  ];

                showRandom();
              },
          }
        );
      };

    showRandom();
  }
);

  // =======================================================
  // INITIAL LIBRARY LOAD
  // =======================================================

  render().catch(
    error => {

      console.error(
        '[library] initial render failed:',
        error
      );

    }
  );
}