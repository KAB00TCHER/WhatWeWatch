// js/home.js
// Page logic. This is the only file that knows about api.js, storage.js,
// AND ui.js at the same time — it wires the search bar, type filters,
// library grid, and detail modal together. It touches the DOM only to grab
// element references; all rendering is delegated to ui.js.

import { searchAll, enrichDetails } from './api.js';
import * as storage from './storage.js';
import * as ui from './ui.js';
import { demoData } from './demoData.js';

let activeType = 'all';
let currentView = 'library'; // 'library' | 'search'
let currentSearchResults = [];
let els = null;

function getEls() {
  if (els) return els;
  els = {
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    typeFilters: document.getElementById('type-filters'),
    resultsSection: document.getElementById('results-section'),
    resultsGrid: document.getElementById('results-grid'),
    libraryGrid: document.getElementById('library-grid'),
    clearSearch: document.getElementById('clear-search'),
    modalOverlay: document.getElementById('modal-overlay'),
    modal: document.getElementById('modal'),
  };
  return els;
}

function byType(items, type) {
  return type === 'all' ? items : items.filter((item) => item.type === type);
}

function getLibraryView() {
  const records = storage.getLibraryWithDetails();
  // demoData is only ever a Stage 1 placeholder so the page isn't empty on
  // first run — it disappears on its own as soon as something real is added.
  return records.length ? records : demoData;
}

function render() {
  const { resultsSection, resultsGrid, libraryGrid } = getEls();

  if (currentView === 'search') {
    resultsSection.hidden = false;
    ui.renderGrid(resultsGrid, byType(currentSearchResults, activeType), { onSelect: openDetail });
  } else {
    resultsSection.hidden = true;
  }

  ui.renderGrid(libraryGrid, byType(getLibraryView(), activeType), { onSelect: openDetail });
}

async function openDetail(item) {
  const { modalOverlay, modal } = getEls();
  const record = storage.getLibraryRecord(item.id, item.provider);
  // Library items were already enriched when they were added; only a fresh
  // search result needs the extra round-trip for runtime/episodes/description.
  const fullItem = record ? item : await enrichDetails(item);

  ui.openModal(modalOverlay, modal, {
    item: fullItem,
    record,
    onAdd: (changes) => {
      storage.addToLibrary(fullItem, changes);
      render();
    },
    onSave: (changes) => {
      storage.updateLibraryRecord(fullItem.id, fullItem.provider, changes);
      render();
    },
    onRemove: () => {
      storage.removeFromLibrary(fullItem.id, fullItem.provider);
      render();
    },
  });
}

export function initHomePage() {
  const { searchForm, searchInput, typeFilters, clearSearch } = getEls();

  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;
    currentSearchResults = await searchAll(query);
    currentView = 'search';
    render();
  });

  clearSearch.addEventListener('click', () => {
    currentView = 'library';
    searchInput.value = '';
    render();
  });

  typeFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.type-filter');
    if (!btn) return;
    activeType = btn.dataset.type;
    ui.setActiveFilter(typeFilters, activeType);
    render();
  });

  render();
}
