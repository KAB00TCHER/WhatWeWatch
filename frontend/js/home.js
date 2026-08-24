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
let libraryGenre = '';
let libraryStatus = '';
let libraryView = 'cards';
const LIBRARY_PAGE_SIZE = 24;

let libraryPage = 1;

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
      libraryPagination:
  document.getElementById('library-pagination'),

    libraryStats:
  document.getElementById('library-stats'),

    librarySort:
      document.getElementById('library-sort'),


    libraryGenre:
      document.getElementById('library-genre'),

      libraryStatuses:
  document.getElementById('library-statuses'),

    randomPicker:
      document.getElementById('random-picker'),

    viewSwitcher:
      document.querySelector('.view-switcher'),

clearSearch:
  document.getElementById(
    'clear-search'
  ),

homeButton:
  document.getElementById(
    'home-button'
  ),

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
// =======================================================
// HOME BUTTON
// =======================================================

homeButton.addEventListener(
  'click',
  async () => {

    currentView =
      'library';

    currentSearchResults =
      [];

    searchInput.value =
      '';

    await render();

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

  }
);

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
    'Поиск';


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

function filterLibraryByStatus(items) {
  if (!libraryStatus) {
    return items;
  }

  return items.filter(
    (item) =>
      item.status === libraryStatus
  );
}


function filterLibraryByGenre(items) {
  if (!libraryGenre) {
    return items;
  }

  const target =
    libraryGenre.toLocaleLowerCase('ru-RU');

  return items.filter((item) => {
    if (!Array.isArray(item.genres)) {
      return false;
    }

    return item.genres.some(
      (genre) =>
        String(genre || '')
          .trim()
          .toLocaleLowerCase('ru-RU') === target
    );
  });
}

function updateGenreFilter(items) {
  const {
    libraryGenre: select,
  } = getEls();

  if (!select) {
    return;
  }

  const genresMap = new Map();

  items.forEach((item) => {
    if (!Array.isArray(item.genres)) {
      return;
    }

    item.genres.forEach((genre) => {
      const name = String(genre || '').trim();

      if (!name) {
        return;
      }

      const key = name.toLocaleLowerCase('ru-RU');

      if (!genresMap.has(key)) {
        genresMap.set(key, name);
      }
    });
  });

  const genres = [...genresMap.values()].sort(
    (a, b) =>
      a.localeCompare(
        b,
        'ru-RU',
        { sensitivity: 'base' }
      )
  );

  const currentValue = libraryGenre;

  select.innerHTML = '';

  const allOption =
    document.createElement('option');

  allOption.value = '';
  allOption.textContent = 'Все жанры';

  select.appendChild(allOption);

  genres.forEach((genre) => {
    const option =
      document.createElement('option');

    option.value = genre;
    option.textContent = genre;

    select.appendChild(option);
  });

  select.value =
    genres.find(
      (genre) =>
        genre.toLocaleLowerCase('ru-RU') ===
        String(currentValue || '').toLocaleLowerCase('ru-RU')
    ) || '';
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



function getLibraryPageItems(items) {
  const totalPages = Math.max(
    1,
    Math.ceil(items.length / LIBRARY_PAGE_SIZE)
  );

  libraryPage = Math.min(
    Math.max(1, libraryPage),
    totalPages
  );

  const start =
    (libraryPage - 1) *
    LIBRARY_PAGE_SIZE;

  return {
    items: items.slice(
      start,
      start + LIBRARY_PAGE_SIZE
    ),
    totalPages,
  };
}

function renderLibraryPagination(totalPages) {
  const {
    libraryPagination,
  } = getEls();

  if (!libraryPagination) {
    return;
  }

  if (totalPages <= 1) {
    libraryPagination.hidden = true;
    libraryPagination.innerHTML = '';
    return;
  }

  libraryPagination.hidden = false;
  libraryPagination.innerHTML = '';

  const fragment =
    document.createDocumentFragment();

  const createButton = (
    label,
    page,
    {
      disabled = false,
      active = false,
      ariaLabel = '',
    } = {}
  ) => {
    const button =
      document.createElement('button');

    button.type = 'button';
    button.className =
      'library-pagination__button';

    if (active) {
      button.classList.add('is-active');
    }

    button.disabled = disabled;
    button.textContent = label;

    if (ariaLabel) {
      button.setAttribute(
        'aria-label',
        ariaLabel
      );
    }

    button.addEventListener(
      'click',
      async () => {
        if (disabled) {
          return;
        }

        libraryPage = page;

        await render();

        const librarySection =
          document.getElementById(
            'library-section'
          );

        if (librarySection) {
          librarySection.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }
    );

    return button;
  };

  fragment.appendChild(
    createButton(
      '‹',
      libraryPage - 1,
      {
        disabled:
          libraryPage <= 1,
        ariaLabel:
          'Предыдущая страница',
      }
    )
  );

  const maxVisiblePages = 5;

  let startPage =
    Math.max(
      1,
      libraryPage -
        Math.floor(maxVisiblePages / 2)
    );

  let endPage =
    Math.min(
      totalPages,
      startPage +
        maxVisiblePages -
        1
    );

  if (
    endPage - startPage + 1 <
    maxVisiblePages
  ) {
    startPage =
      Math.max(
        1,
        endPage -
          maxVisiblePages +
          1
      );
  }

  if (startPage > 1) {
    fragment.appendChild(
      createButton(
        '1',
        1,
        {
          active: libraryPage === 1,
        }
      )
    );

    if (startPage > 2) {
      const dots =
        document.createElement('span');

      dots.className =
        'library-pagination__dots';

      dots.textContent = '…';

      fragment.appendChild(dots);
    }
  }

  for (
    let page = startPage;
    page <= endPage;
    page += 1
  ) {
    if (
      page === 1 &&
      startPage > 1
    ) {
      continue;
    }

    fragment.appendChild(
      createButton(
        String(page),
        page,
        {
          active:
            page === libraryPage,
        }
      )
    );
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots =
        document.createElement('span');

      dots.className =
        'library-pagination__dots';

      dots.textContent = '…';

      fragment.appendChild(dots);
    }

    fragment.appendChild(
      createButton(
        String(totalPages),
        totalPages,
        {
          active:
            libraryPage === totalPages,
        }
      )
    );
  }

  fragment.appendChild(
    createButton(
      '›',
      libraryPage + 1,
      {
        disabled:
          libraryPage >= totalPages,
        ariaLabel:
          'Следующая страница',
      }
    )
  );

  libraryPagination.appendChild(
    fragment
  );
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

updateGenreFilter(library);

const filteredLibrary =
  filterLibraryByStatus(
    filterLibraryByGenre(
      filterResults(library)
    )
  );

const sortedLibrary =
  sortLibrary(filteredLibrary);

const {
  items: pageItems,
  totalPages,
} =
  getLibraryPageItems(
    sortedLibrary
  );

renderLibraryPagination(
  totalPages
);


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
    pageItems,
    {
      onSelect: openDetail,
    }
  );
} else {
  ui.renderGrid(
    libraryGrid,
    pageItems,
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
  await enrichDetails(item);


ui.openModal(
  modalOverlay,
  modal,
  {
    item: fullItem,

    record,

    onOpenItem:
      openDetail,


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

  homeButton,

  librarySort: librarySortSelect,
  libraryGenre: libraryGenreSelect,
  libraryStatuses,
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

libraryPage = 1;
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
    libraryPage = 1;
    await render();
  }
);


// =======================================================
// LIBRARY GENRE
// =======================================================

libraryGenreSelect.addEventListener(
  'change',
  async () => {
    libraryGenre =
      libraryGenreSelect.value;

    libraryPage = 1;

    await render();
  }
);



// =======================================================
// LIBRARY STATUS
// =======================================================

libraryStatuses.addEventListener(
  'click',
  async (e) => {
    const button =
      e.target.closest(
        '.library-status'
      );

    if (!button) {
      return;
    }

    libraryStatus =
      button.dataset.status || '';

    libraryPage = 1;

    libraryStatuses
      .querySelectorAll(
        '.library-status'
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

const records =
  await storage.getRandomLibraryCandidates();

if (!records.length) {
  alert(
    'В запланированном и поставленном на паузу пока ничего нет.'
  );

  return;
}

const candidates =
  activeTypes.size === 0
    ? records
    : records.filter((record) => {
        const media =
          storage.getCachedMediaItem(
            record.mediaId,
            record.provider
          );

        return (
          media &&
          media.type &&
          activeTypes.has(
            media.type
          )
        );
      });

if (!candidates.length) {
  alert(
    'Нет карточек, соответствующих выбранным типам.'
  );

  return;
}

if (!candidates.length) {
  alert(
    'В запланированном и поставленном на паузу пока ничего нет.'
  );

  return;
}

const randomRecord =
  candidates[
    Math.floor(
      Math.random() *
      candidates.length
    )
  ];

let currentRecord =
  randomRecord;

let currentItem =
  await storage.getLibraryItemWithDetails(
    randomRecord
  );

  

if (!currentItem) {
  alert(
    'Не удалось загрузить случайную карточку.'
  );

  return;
}

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
  async () => {

    if (
      candidates.length === 1
    ) {
      return;
    }

    const available =
      candidates.filter(
        record =>
          record.mediaId !==
          currentRecord.mediaId
      );

    const nextRecord =
      available[
        Math.floor(
          Math.random() *
          available.length
        )
      ];

    const nextItem =
      await storage.getLibraryItemWithDetails(
        nextRecord
      );

    if (!nextItem) {
      return;
    }

    currentRecord =
      nextRecord;

    currentItem =
      nextItem;

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