import {
  searchAll,
  enrichDetails,
} from './api.js';

import * as storage from './storage.js';
import * as ui from './ui.js';


const PAGE_SIZE = 24;

const state = {
  activeTypes: new Set(),

  view: 'library',
  searchResults: [],

  sort: 'added-desc',
  genre: '',
  status: '',
  libraryView: 'cards',

  page: 1,

  searching: false,
};


let els = null;
let loadingStartedAt = 0;
let loadingTimer1 = null;
let loadingTimer2 = null;


// =========================================================
// DOM
// =========================================================

function getEls() {
  if (els) {
    return els;
  }

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
      document.getElementById('clear-search'),

    homeButton:
      document.getElementById('home-button'),

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

  state.searching = true;
  loadingStartedAt = Date.now();

  loadingOverlay.hidden = false;
  searchInput.disabled = true;
  searchButton.disabled = true;

  searchButton.dataset.originalText =
    searchButton.textContent;

  searchButton.textContent = 'Поиск...';

  loadingText.textContent =
    'Подбираем результаты из всех доступных баз данных';

  clearTimeout(loadingTimer1);
  clearTimeout(loadingTimer2);

  loadingTimer1 = setTimeout(() => {
    loadingText.textContent =
      'Это может занять немного больше времени...';
  }, 3000);

  loadingTimer2 = setTimeout(() => {
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

  const remaining =
    Math.max(
      0,
      1000 -
        (Date.now() - loadingStartedAt)
    );

  if (remaining) {
    await new Promise(resolve =>
      setTimeout(resolve, remaining)
    );
  }

  state.searching = false;

  clearTimeout(loadingTimer1);
  clearTimeout(loadingTimer2);

  loadingOverlay.hidden = true;
  searchInput.disabled = false;
  searchButton.disabled = false;

  searchButton.textContent =
    searchButton.dataset.originalText ||
    'Поиск';

  searchInput.focus();
}


// =========================================================
// FILTERS
// =========================================================

function filterByType(items) {
  if (!state.activeTypes.size) {
    return items;
  }

  return items.filter(item =>
    state.activeTypes.has(item.type)
  );
}


function filterLibrary(items) {
  return items.filter(item => {
    if (
      state.status &&
      item.status !== state.status
    ) {
      return false;
    }

    if (!state.genre) {
      return true;
    }

    const target =
      state.genre.toLocaleLowerCase('ru-RU');

    return Array.isArray(item.genres) &&
      item.genres.some(genre =>
        String(genre || '')
          .trim()
          .toLocaleLowerCase('ru-RU') === target
      );
  });
}


function updateGenreFilter(items) {
  const select =
    getEls().libraryGenre;

  if (!select) {
    return;
  }

  const genres = new Map();

  items.forEach(item => {
    if (!Array.isArray(item.genres)) {
      return;
    }

    item.genres.forEach(genre => {
      const name =
        String(genre || '').trim();

      if (!name) {
        return;
      }

      const key =
        name.toLocaleLowerCase('ru-RU');

      if (!genres.has(key)) {
        genres.set(key, name);
      }
    });
  });

  const current =
    state.genre.toLocaleLowerCase('ru-RU');

  select.innerHTML =
    '<option value="">Все жанры</option>';

  [...genres.values()]
    .sort((a, b) =>
      a.localeCompare(
        b,
        'ru-RU',
        { sensitivity: 'base' }
      )
    )
    .forEach(genre => {
      const option =
        document.createElement('option');

      option.value = genre;
      option.textContent = genre;

      if (
        genre.toLocaleLowerCase('ru-RU') ===
        current
      ) {
        option.selected = true;
      }

      select.appendChild(option);
    });
}


// =========================================================
// SORT
// =========================================================

function sortLibrary(items) {
  const result = [...items];

  const stringCompare = (a, b) =>
    String(a || '').localeCompare(
      String(b || ''),
      'ru',
      { sensitivity: 'base' }
    );

  const numberCompare = (a, b) => {
    const left = Number(a);
    const right = Number(b);

    if (
      Number.isNaN(left) &&
      Number.isNaN(right)
    ) {
      return 0;
    }

    if (Number.isNaN(left)) {
      return 1;
    }

    if (Number.isNaN(right)) {
      return -1;
    }

    return left - right;
  };

  const dateCompare = (
    a,
    b
  ) =>
    new Date(a || 0) -
    new Date(b || 0);

  switch (state.sort) {
    case 'updated-desc':
      return result.sort((a, b) =>
        dateCompare(
          b.updatedAt,
          a.updatedAt
        )
      );

    case 'title-asc':
      return result.sort((a, b) =>
        stringCompare(
          a.title,
          b.title
        )
      );

    case 'title-desc':
      return result.sort((a, b) =>
        stringCompare(
          b.title,
          a.title
        )
      );

    case 'year-desc':
      return result.sort((a, b) =>
        numberCompare(
          b.year,
          a.year
        )
      );

    case 'year-asc':
      return result.sort((a, b) =>
        numberCompare(
          a.year,
          b.year
        )
      );

    case 'user-rating-desc':
      return result.sort((a, b) =>
        numberCompare(
          b.userRating,
          a.userRating
        )
      );

    case 'external-rating-desc':
      return result.sort((a, b) =>
        numberCompare(
          b.rating,
          a.rating
        )
      );

    case 'added-desc':
    default:
      return result.sort((a, b) =>
        dateCompare(
          b.addedAt,
          a.addedAt
        )
      );
  }
}


// =========================================================
// PAGINATION
// =========================================================

function getPage(items) {
  const totalPages =
    Math.max(
      1,
      Math.ceil(
        items.length / PAGE_SIZE
      )
    );

  state.page =
    Math.min(
      Math.max(1, state.page),
      totalPages
    );

  const start =
    (state.page - 1) *
    PAGE_SIZE;

  return {
    items: items.slice(
      start,
      start + PAGE_SIZE
    ),

    totalPages,
  };
}


function createPageButton(
  label,
  page,
  {
    disabled = false,
    active = false,
    ariaLabel = '',
  } = {}
) {
  const button =
    document.createElement('button');

  button.type = 'button';
  button.className =
    'library-pagination__button';

  button.disabled = disabled;
  button.textContent = label;

  if (active) {
    button.classList.add('is-active');
    button.setAttribute(
      'aria-current',
      'page'
    );
  }

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

      state.page = page;
      await render();

      document
        .getElementById('library-section')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    }
  );

  return button;
}


function renderPagination(totalPages) {
  const pagination =
    getEls().libraryPagination;

  if (!pagination) {
    return;
  }

  pagination.innerHTML = '';

  if (totalPages <= 1) {
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;

  const fragment =
    document.createDocumentFragment();

  fragment.appendChild(
    createPageButton(
      '‹',
      state.page - 1,
      {
        disabled: state.page <= 1,
        ariaLabel:
          'Предыдущая страница',
      }
    )
  );

  const max = 5;

  let start =
    Math.max(
      1,
      state.page -
        Math.floor(max / 2)
    );

  let end =
    Math.min(
      totalPages,
      start + max - 1
    );

  if (
    end - start + 1 < max
  ) {
    start =
      Math.max(
        1,
        end - max + 1
      );
  }

  if (start > 1) {
    fragment.appendChild(
      createPageButton(
        '1',
        1,
        {
          active:
            state.page === 1,
        }
      )
    );

    if (start > 2) {
      const dots =
        document.createElement('span');

      dots.className =
        'library-pagination__dots';

      dots.textContent = '…';

      fragment.appendChild(dots);
    }
  }

  for (
    let page = start;
    page <= end;
    page++
  ) {
    if (
      page === 1 &&
      start > 1
    ) {
      continue;
    }

    fragment.appendChild(
      createPageButton(
        String(page),
        page,
        {
          active:
            page === state.page,
        }
      )
    );
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      const dots =
        document.createElement('span');

      dots.className =
        'library-pagination__dots';

      dots.textContent = '…';

      fragment.appendChild(dots);
    }

    fragment.appendChild(
      createPageButton(
        String(totalPages),
        totalPages,
        {
          active:
            state.page === totalPages,
        }
      )
    );
  }

  fragment.appendChild(
    createPageButton(
      '›',
      state.page + 1,
      {
        disabled:
          state.page >= totalPages,
        ariaLabel:
          'Следующая страница',
      }
    )
  );

  pagination.appendChild(fragment);
}


// =========================================================
// LIBRARY
// =========================================================

async function getLibrary() {
  try {
    return await storage.getLibraryWithDetails();
  } catch (error) {
    console.error(
      '[library] load failed:',
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
    libraryStats,
  } = getEls();

  if (state.view === 'search') {
    resultsSection.hidden = false;

    ui.renderGrid(
      resultsGrid,
      filterByType(
        state.searchResults
      ),
      {
        onSelect: openDetail,
      }
    );
  } else {
    resultsSection.hidden = true;
  }

  const library =
    await getLibrary();

  updateGenreFilter(library);

  const filtered =
    filterLibrary(
      filterByType(library)
    );

  const sorted =
    sortLibrary(filtered);

  const {
    items,
    totalPages,
  } = getPage(sorted);

  renderPagination(totalPages);

  ui.renderStats(
    libraryStats,
    library
  );

  const renderMethod =
    state.libraryView === 'list'
      ? ui.renderList
      : ui.renderGrid;

  renderMethod(
    libraryGrid,
    items,
    {
      onSelect: openDetail,
    }
  );
}


// =========================================================
// DETAIL
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
      '[library] record load failed:',
      error
    );
  }

  const fullItem =
    await enrichDetails(item);

  ui.openModal(
    modalOverlay,
    modal,
    {
      item: fullItem,
      record,
      onOpenItem: openDetail,

      onAdd: async changes => {
        try {
          await storage.addToLibrary(
            fullItem,
            changes
          );

          await render();

          return true;
        } catch (error) {
          console.error(
            '[library] add failed:',
            error
          );

          alert(
            error.message ||
            'Не удалось сохранить изменения.'
          );

          return false;
        }
      },

      onSave: async changes => {
        try {
          await storage.updateLibraryRecord(
            fullItem.id,
            fullItem.provider,
            changes
          );

          await render();
        } catch (error) {
          console.error(
            '[library] update failed:',
            error
          );

          alert(
            error.message ||
            'Не удалось сохранить изменения.'
          );

          throw error;
        }
      },

      onRemove: async () => {
        try {
          await storage.removeFromLibrary(
            fullItem.id,
            fullItem.provider
          );

          await render();
        } catch (error) {
          console.error(
            '[library] remove failed:',
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
// RANDOM PICKER
// =========================================================

async function openRandomPicker() {
  if (state.searching) {
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
    state.activeTypes.size === 0
      ? records
      : records.filter(record => {
          const media =
            storage.getCachedMediaItem(
              record.mediaId,
              record.provider
            );

          return (
            media?.type &&
            state.activeTypes.has(
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

  let currentIndex = -1;
  let currentItem = null;

  const pick = async () => {
    if (candidates.length === 1) {
      currentIndex = 0;
    } else {
      let next = currentIndex;

      while (next === currentIndex) {
        next =
          Math.floor(
            Math.random() *
            candidates.length
          );
      }

      currentIndex = next;
    }

    currentItem =
      await storage.getLibraryItemWithDetails(
        candidates[currentIndex]
      );

    return currentItem;
  };

  const {
    modalOverlay,
    modal,
  } = getEls();

  await pick();

  if (!currentItem) {
    alert(
      'Не удалось загрузить случайную карточку.'
    );

    return;
  }

  const show = () => {
    ui.openRandomChoice(
      modalOverlay,
      modal,
      currentItem,
      {
        onOpen: openDetail,
        onAgain: async () => {
          const next =
            await pick();

          if (next) {
            show();
          }
        },
      }
    );
  };

  show();
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
    librarySort,
    libraryGenre,
    libraryStatuses,
    randomPicker,
    viewSwitcher,
  } = getEls();


  window.addEventListener(
    'authchange',
    async () => {
      state.view = 'library';
      state.searchResults = [];
      state.page = 1;

      await render();
    }
  );


  searchForm.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      if (state.searching) {
        return;
      }

      const query =
        searchInput.value.trim();

      if (!query) {
        return;
      }

      showLoading();

      try {
        state.searchResults =
          await searchAll(
            query,
            state.activeTypes
          );

        state.view = 'search';

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


  clearSearch.addEventListener(
    'click',
    async () => {
      state.view = 'library';
      state.searchResults = [];
      searchInput.value = '';
      state.page = 1;

      await render();
    }
  );


  homeButton.addEventListener(
    'click',
    async () => {
      state.view = 'library';
      state.searchResults = [];
      searchInput.value = '';
      state.page = 1;

      await render();

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  );


  typeFilters.addEventListener(
    'click',
    async event => {
      const button =
        event.target.closest(
          '.type-filter'
        );

      if (
        !button ||
        state.searching
      ) {
        return;
      }

      const type =
        button.dataset.type;

      if (
        state.activeTypes.has(type)
      ) {
        state.activeTypes.delete(type);
      } else {
        state.activeTypes.add(type);
      }

      button.classList.toggle(
        'is-active',
        state.activeTypes.has(type)
      );

      state.page = 1;

      await render();
    }
  );


  librarySort.addEventListener(
    'change',
    async () => {
      state.sort =
        librarySort.value;

      state.page = 1;

      await render();
    }
  );


  libraryGenre.addEventListener(
    'change',
    async () => {
      state.genre =
        libraryGenre.value;

      state.page = 1;

      await render();
    }
  );


  libraryStatuses.addEventListener(
    'click',
    async event => {
      const button =
        event.target.closest(
          '.library-status'
        );

      if (!button) {
        return;
      }

      state.status =
        button.dataset.status || '';

      state.page = 1;

      libraryStatuses
        .querySelectorAll(
          '.library-status'
        )
        .forEach(
          current =>
            current.classList.toggle(
              'is-active',
              current === button
            )
        );

      await render();
    }
  );


  viewSwitcher.addEventListener(
    'click',
    async event => {
      const button =
        event.target.closest(
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

      state.libraryView = view;

      viewSwitcher
        .querySelectorAll(
          '.view-switcher__button'
        )
        .forEach(
          current =>
            current.classList.toggle(
              'is-active',
              current === button
            )
        );

      await render();
    }
  );


  randomPicker.addEventListener(
    'click',
    openRandomPicker
  );


  render().catch(error =>
    console.error(
      '[library] initial render failed:',
      error
    )
  );
}