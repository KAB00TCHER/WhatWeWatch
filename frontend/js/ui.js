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
  if (item.type === 'movie' && item.runtime) return `${item.runtime} мин`;
  if ((item.type === 'series' || item.type === 'anime') && item.episodes) return `${item.episodes} эп`;
  if (item.type === 'game' && item.playtime) return `${item.playtime}ч`;
  return '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

export function renderGrid(container, items, { onSelect } = {}) {
  container.classList.remove('card-grid--list');
  container.classList.add('card-grid');

  container.innerHTML = '';

  if (!items.length) {
    renderEmptyState(container, 'Здесь пока ничего нет.');
    return;
  }
  const fragment = document.createDocumentFragment();
  items.forEach((item) => fragment.appendChild(renderCard(item, onSelect)));
  container.appendChild(fragment);
}

export function renderList(container, items, { onSelect } = {}) {
  container.classList.remove('card-grid');
  container.classList.add('card-grid--list');

  container.innerHTML = '';

  if (!items.length) {
    renderEmptyState(container, 'Здесь пока ничего нет.');
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const row = document.createElement('article');
    row.className = 'library-list-item';
    row.tabIndex = 0;

    const externalRating = item.rating != null
      ? `<span class="library-list-item__rating">★ ${item.rating} <small>БД</small></span>`
      : '<span class="library-list-item__rating library-list-item__empty">—</span>';

    const userRating = item.userRating != null
      ? `<span class="library-list-item__rating library-list-item__rating--user">★ ${item.userRating} <small>Моя</small></span>`
      : '<span class="library-list-item__rating library-list-item__empty">—</span>';

    const note = item.note?.trim()
      ? `<span class="library-list-item__note">${escapeHtml(item.note.trim())}</span>`
      : '';

    row.innerHTML = `
      <div class="library-list-item__poster">
        ${
          item.poster
            ? `<img src="${item.poster}" alt="" loading="lazy">`
            : `<span>${escapeHtml((item.title || '?')[0])}</span>`
        }
      </div>

      <div class="library-list-item__info">
        <span class="card__type">
          ${TYPE_LABELS[item.type] || item.type}
        </span>

        <h3>${escapeHtml(item.title)}</h3>

        <p>
          ${escapeHtml(
            [item.year, secondaryLine(item)]
              .filter(Boolean)
              .join(' · ')
          )}
        </p>

        ${note}
      </div>

      <div class="library-list-item__status">
        ${
          item.status
            ? `<span class="card__status card__status--${item.status}">
                ${STATUS_LABELS[item.status] || item.status}
              </span>`
            : ''
        }
      </div>

      <div class="library-list-item__ratings">
        ${externalRating}
        ${userRating}
      </div>
    `;

    const activate = () => onSelect && onSelect(item);

    row.addEventListener('click', activate);

    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate();
      }
    });

    fragment.appendChild(row);
  });

  container.appendChild(fragment);
}

export function openRandomChoice(
  overlayEl,
  modalEl,
  item,
  { onOpen, onAgain } = {}
) {
  modalEl.innerHTML = `
    <button
      class="modal__close"
      type="button"
      data-action="close"
      aria-label="Закрыть"
    >
      &times;
    </button>

    <div class="random-choice">

      <p class="random-choice__eyebrow">
        А что если посмотреть это?
      </p>

      ${
        item.poster
          ? `<img
              class="random-choice__poster"
              src="${item.poster}"
              alt="${escapeHtml(item.title)}"
            />`
          : `<div class="random-choice__poster random-choice__poster--placeholder">
              ${escapeHtml((item.title || '?')[0])}
            </div>`
      }

      <span class="card__type">
        ${TYPE_LABELS[item.type] || item.type}
      </span>

      <h2>${escapeHtml(item.title)}</h2>

      <p class="random-choice__meta">
        ${escapeHtml(
          [
            item.year,
            secondaryLine(item),
            item.status
              ? STATUS_LABELS[item.status] || item.status
              : ''
          ]
            .filter(Boolean)
            .join(' · ')
        )}
      </p>

      <div class="random-choice__actions">

        <button
          type="button"
          class="button button--primary"
          data-action="open"
        >
          Открыть
        </button>

        <button
          type="button"
          class="button"
          data-action="again"
        >
          Ещё раз
        </button>

      </div>

    </div>
  `;

  const close = () => {
    overlayEl.hidden = true;
    modalEl.innerHTML = '';
  };

  modalEl
    .querySelector('[data-action="close"]')
    .addEventListener('click', close);

  modalEl
    .querySelector('[data-action="open"]')
    .addEventListener('click', () => {
      close();
      onOpen && onOpen(item);
    });

  modalEl
    .querySelector('[data-action="again"]')
    .addEventListener('click', () => {
      onAgain && onAgain();
    });

  overlayEl.hidden = false;
}

export function renderEmptyState(container, message) {
  container.innerHTML = `<p class="empty-state">${escapeHtml(message)}</p>`;
}
export function renderStats(container, items) {
  const stats = {
    total: items.length,
    completed: 0,
    watching: 0,
    planned: 0,
    on_hold: 0,
    dropped: 0,

    movie: 0,
    series: 0,
    anime: 0,
    game: 0,
  };

  items.forEach((item) => {
    if (stats[item.status] !== undefined) {
      stats[item.status] += 1;
    }

    if (stats[item.type] !== undefined) {
      stats[item.type] += 1;
    }
  });

  container.innerHTML = `
    <div class="stats-card stats-card--main">
      <strong>${stats.total}</strong>
      <span>Всего</span>
    </div>

    <div class="stats-card">
      <strong>${stats.completed}</strong>
      <span>Завершено</span>
    </div>

    <div class="stats-card">
      <strong>${stats.watching}</strong>
      <span>Смотрю</span>
    </div>

    <div class="stats-card">
      <strong>${stats.planned}</strong>
      <span>Запланировано</span>
    </div>

    <div class="stats-card">
      <strong>${stats.on_hold}</strong>
      <span>На паузе</span>
    </div>

    <div class="stats-card">
      <strong>${stats.dropped}</strong>
      <span>Дропнуто</span>
    </div>

    <div class="stats-card stats-card--type">
      <strong>${stats.movie}</strong>
      <span>Фильмы</span>
    </div>

    <div class="stats-card stats-card--type">
      <strong>${stats.series}</strong>
      <span>Сериалы</span>
    </div>

    <div class="stats-card stats-card--type">
      <strong>${stats.anime}</strong>
      <span>Аниме</span>
    </div>

    <div class="stats-card stats-card--type">
      <strong>${stats.game}</strong>
      <span>Игры</span>
    </div>
  `;
}

function renderCard(item, onSelect) {
  const card = document.createElement('article');
  card.className = 'card';
  card.tabIndex = 0;

  const poster = item.poster
    ? `<img class="card__poster" src="${item.poster}" alt="${escapeHtml(item.title)}" loading="lazy" />`
    : `<div class="card__poster card__poster--placeholder">${escapeHtml((item.title || '?')[0])}</div>`;

    const externalRating = item.rating != null
  ? `<span class="card__rating">★ ${item.rating} <small>Оценка</small></span>`
  : '';

const userRating = item.userRating != null
  ? `<span class="card__user-rating">★ ${item.userRating} <small>Моя оценка</small></span>`
  : '';

const note = item.note?.trim()
  ? `<p class="card__note">${escapeHtml(item.note.trim())}</p>`
  : '';


  card.innerHTML = `
    ${poster}
    <div class="card__body">
      <span class="card__type">${TYPE_LABELS[item.type] || item.type}</span>
      <h3 class="card__title">${escapeHtml(item.title)}</h3>
      <p class="card__meta">${escapeHtml([item.year, secondaryLine(item)].filter(Boolean).join(' · '))}</p>
     ${item.status ? `<span class="card__status card__status--${item.status}">${STATUS_LABELS[item.status] || item.status}</span>` : ''}
      ${externalRating}
      ${userRating}
      ${note}
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
    <button class="modal__close" type="button" data-action="close" aria-label="Закрыть">&times;</button>
    ${item.backdrop ? `<img class="modal__backdrop" src="${item.backdrop}" alt="" />` : ''}
    <div class="modal__content">
      <span class="card__type">${TYPE_LABELS[item.type] || item.type}</span>
      <h2>${escapeHtml(item.title)}</h2>
      <p class="modal__meta">${escapeHtml(
        [item.year, secondaryLine(item), item.rating != null ? `★ ${item.rating}` : '']
          .filter(Boolean)
          .join(' · ')
      )}</p>
      <p class="modal__description">${escapeHtml(item.description) || 'Описание отсутствует.'}</p>

      <form class="modal__form" id="modal-form">
        <label>
          Статус
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
          Моя оценка (0–10)
          <input type="number" name="userRating" min="0" max="10" step="0.5" value="${record?.userRating ?? ''}" />
        </label>
        <label>
          Заметка
          <textarea name="note" rows="3">${escapeHtml(record?.note ?? '')}</textarea>
        </label>
        <div class="modal__actions">
          <button type="submit" class="button button--primary">${inLibrary ? 'Сохранить' : 'Добавить в библиотеку'}</button>
          ${inLibrary ? '<button type="button" class="button button--danger" data-action="remove">Удалить</button>' : ''}
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
