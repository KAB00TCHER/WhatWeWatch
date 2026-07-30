// js/ui.js
// All interface rendering lives here, and only here. This file never
// imports api.js or storage.js and never calls fetch() or localStorage —
// it only ever receives data and callback functions from home.js and
// renders. That's what keeps the UI independent of the API (Principle #1).

const STATUS_LABELS = {
  planned: 'Запланировано',
  watching: 'Смотрю',
  completed: 'Завершено',
  on_hold: 'На паузе',
  dropped: 'Дропнуто',
};

const TYPE_LABELS = {
  movie: 'Фильмы',
  series: 'Сериалы',
  anime: 'Аниме',
  game: 'Игры',
};

function secondaryLine(item) {
  if (item.type === 'movie' && item.runtime) return `${item.runtime} min`;
  if ((item.type === 'series' || item.type === 'anime') && item.episodes) return `${item.episodes} ep`;
  if (item.type === 'game' && item.playtime) return `${item.playtime}h`;
  return '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

export function renderGrid(container, items, { onSelect } = {}) {
  container.innerHTML = '';
  if (!items.length) {
    renderEmptyState(container, 'Nothing here yet.');
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.appendChild(renderCard(item, onSelect)));
  container.appendChild(fragment);
}

export function renderEmptyState(container, message) {
  container.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
}

function renderCard(item, onSelect) {
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0;

  const poster = item.poster
    ? `<img class="card__poster" src="${item.poster}" alt="${escapeHtml(item.title)}" loading="lazy" />`
    : `<div class="card__poster card__poster--placeholder">${escapeHtml((item.title || '?')[0])}</div>`;

  card.innerHTML = `
    ${poster}
    <div class="card__body">
      <span class="card__type">${TYPE_LABELS[item.type] || item.type}</span>
      <h3 class="card__title">${escapeHtml(item.title)}</h3>
      <p class="card__meta">${escapeHtml([item.year, secondaryLine(item)].filter(Boolean).join(' · '))}</p>
      ${item.status ? `<span class="card__status card__status--${item.status}">${STATUS_LABELS[item.status] || item.status}</span>` : ''}
      ${item.rating != null ? `<span class="card__rating">★ ${item.rating}</span>` : ''}
    </div>
  `;

  const activate = () => onSelect && onSelect(item);
  card.addEventListener('click', activate);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  });

  return card;
}

export function setActiveFilter(container, type) {
  container.querySelectorAll('.type-filter').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.type === type);
  });
}

// item = Unified Media Item, record = User Record or null (not yet in library)
export function openModal(overlayEl, modalEl, { item, record, onAdd, onSave, onRemove }) {
  const inLibrary = Boolean(record);

  modalEl.innerHTML = `
    <button class="modal__close" type="button" data-action="close" aria-label="Close">&times;</button>
    ${item.backdrop ? `<img class="modal__backdrop" src="${item.backdrop}" alt="" />` : ''}
    <div class="modal__content">
      <span class="card__type">${TYPE_LABELS[item.type] || item.type}</span>
      <h2>${escapeHtml(item.title)}</h2>
      <p class="modal__meta">${escapeHtml(
        [item.year, secondaryLine(item), item.rating != null ? `★ ${item.rating}` : '']
          .filter(Boolean)
          .join(' · ')
      )}</p>
      <p class="modal__description">${escapeHtml(item.description) || 'No description available.'}</p>

      <form class="modal__form" id="modal-form">
        <label>
          Status
          <select name="status">
            ${Object.entries(STATUS_LABELS)
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${record?.status === value ? 'selected' : ''}>${label}</option>`
              )
              .join('')}
          </select>
        </label>
        <label>
          Your rating (0–10)
          <input type="number" name="userRating" min="0" max="10" step="0.5" value="${record?.userRating ?? ''}" />
        </label>
        <label>
          Note
          <textarea name="note" rows="3">${escapeHtml(record?.note ?? '')}</textarea>
        </label>
        <div class="modal__actions">
          <button type="submit" class="button button--primary">${inLibrary ? 'Save' : 'Add to library'}</button>
          ${inLibrary ? '<button type="button" class="button button--danger" data-action="remove">Remove</button>' : ''}
        </div>
      </form>
    </div>
  `;

  function handleOverlayClick(e) {
    if (e.target === overlayEl) close();
  }

  const close = () => {
    overlayEl.hidden = true;
    overlayEl.removeEventListener('click', handleOverlayClick);
    modalEl.innerHTML = '';
  };

  modalEl.querySelector('[data-action="close"]').addEventListener('click', close);
  overlayEl.addEventListener('click', handleOverlayClick);

  modalEl.querySelector('#modal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const changes = {
      status: formData.get('status'),
      userRating: formData.get('userRating') ? Number(formData.get('userRating')) : null,
      note: formData.get('note') || '',
    };
    if (inLibrary) {
      onSave && onSave(changes);
    } else {
      onAdd && onAdd(changes);
    }
    close();
  });

  const removeBtn = modalEl.querySelector('[data-action="remove"]');
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      onRemove && onRemove();
      close();
    });
  }

  overlayEl.hidden = false;
}
