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

function genresLine(item) {
  if (!Array.isArray(item.genres) || !item.genres.length) {
    return '';
  }

  return item.genres
    .slice(0, 2)
    .join(' · ');
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

${
  genresLine(item)
    ? `<p class="card__genres">${escapeHtml(genresLine(item))}</p>`
    : ''
}

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
      <p class="card__meta">
  ${escapeHtml(
    [item.year, secondaryLine(item)]
      .filter(Boolean)
      .join(' · ')
  )}
</p>

${
  genresLine(item)
    ? `<p class="card__genres">${escapeHtml(genresLine(item))}</p>`
    : ''
}
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
export function openModal(
  overlayEl,
  modalEl,
  {
    item,
    record,
    onAdd,
    onSave,
    onRemove,
  }
) {
  const inLibrary =
    Boolean(record);


  // =====================================================
  // HELPERS
  // =====================================================

  const formatRuntime =
    minutes => {
      if (!minutes) {
        return '';
      }

      const hours =
        Math.floor(
          minutes / 60
        );

      const mins =
        minutes % 60;

      if (!hours) {
        return `${mins} мин`;
      }

      if (!mins) {
        return `${hours} ч`;
      }

      return `${hours} ч ${mins} мин`;
    };


  const renderGenres =
    () => {
      if (
        !Array.isArray(
          item.genres
        ) ||
        !item.genres.length
      ) {
        return '';
      }

      return `
        <div class="rich-modal__genres">
          ${item.genres
            .map(
              genre =>
                `<span class="rich-modal__genre">
                  ${escapeHtml(genre)}
                </span>`
            )
            .join('')}
        </div>
      `;
    };


  const renderRating =
    (
      value,
      label,
      className = ''
    ) => {
      if (
        value === null ||
        value === undefined ||
        value === ''
      ) {
        return '';
      }

      return `
        <div class="rich-modal__rating ${className}">
          <strong>
            ★ ${escapeHtml(value)}
          </strong>

          <span>
            ${label}
          </span>
        </div>
      `;
    };


  const renderFacts =
    () => {
      const facts = [];

      if (item.countries?.length) {
        facts.push({
          label: 'Страна',
          value:
            item.countries.join(', '),
        });
      }

      if (item.language) {
        facts.push({
          label: 'Язык',
          value:
            item.language,
        });
      }

      if (
        item.budget &&
        item.type === 'movie'
      ) {
        facts.push({
          label: 'Бюджет',
          value:
            item.budget,
        });
      }

      if (
        item.revenue &&
        item.type === 'movie'
      ) {
        facts.push({
          label: 'Сборы',
          value:
            item.revenue,
        });
      }

      if (item.director) {
        facts.push({
          label: 'Режиссёр',
          value:
            item.director,
        });
      }

      if (
        Array.isArray(
          item.writers
        ) &&
        item.writers.length
      ) {
        facts.push({
          label: 'Сценарий',
          value:
            item.writers.join(', '),
        });
      }

      if (
        item.type === 'series' &&
        item.episodes
      ) {
        facts.push({
          label: 'Эпизодов',
          value:
            item.episodes,
        });
      }

      if (!facts.length) {
        return '';
      }

      return `
        <section class="rich-modal__section">
          <h3>Информация</h3>

          <div class="rich-modal__facts">
            ${facts
              .map(
                fact => `
                  <div class="rich-modal__fact">
                    <span>
                      ${escapeHtml(
                        fact.label
                      )}
                    </span>

                    <strong>
                      ${escapeHtml(
                        String(
                          fact.value
                        )
                      )}
                    </strong>
                  </div>
                `
              )
              .join('')}
          </div>
        </section>
      `;
    };


  const renderCast =
    () => {
      if (
        !Array.isArray(
          item.cast
        ) ||
        !item.cast.length
      ) {
        return '';
      }

      return `
        <section class="rich-modal__section">
          <h3>В ролях</h3>

          <div class="rich-modal__people">
            ${item.cast
              .map(
                person => `
                  <div class="rich-modal__person">

                    ${
                      person.photo
                        ? `
                          <img
                            src="${person.photo}"
                            alt="${escapeHtml(
                              person.name
                            )}"
                            loading="lazy"
                          >
                        `
                        : `
                          <div class="rich-modal__person-placeholder">
                            ●
                          </div>
                        `
                    }

                    <strong>
                      ${escapeHtml(
                        person.name
                      )}
                    </strong>

                    ${
                      person.character
                        ? `
                          <span>
                            ${escapeHtml(
                              person.character
                            )}
                          </span>
                        `
                        : ''
                    }

                  </div>
                `
              )
              .join('')}
          </div>
        </section>
      `;
    };


  const renderProviders =
    () => {
      if (
        !Array.isArray(
          item.watchProviders
        ) ||
        !item.watchProviders.length
      ) {
        return '';
      }

      return `
        <section class="rich-modal__section">
          <h3>Где посмотреть</h3>

          <div class="rich-modal__providers">
            ${item.watchProviders
              .map(
                provider => `
                  <div class="rich-modal__provider">

                    ${
                      provider.logo
                        ? `
                          <img
                            src="${provider.logo}"
                            alt=""
                          >
                        `
                        : ''
                    }

                    <span>
                      ${escapeHtml(
                        provider.name
                      )}
                    </span>

                  </div>
                `
              )
              .join('')}
          </div>
        </section>
      `;
    };


  const renderSimilar =
    () => {
      if (
        !Array.isArray(
          item.similar
        ) ||
        !item.similar.length
      ) {
        return '';
      }

      return `
        <section class="rich-modal__section">
          <h3>Похожие</h3>

          <div class="rich-modal__similar">
            ${item.similar
              .map(
                similar => `
                  <div class="rich-modal__similar-card">

                    ${
                      similar.poster
                        ? `
                          <img
                            src="${similar.poster}"
                            alt="${escapeHtml(
                              similar.title
                            )}"
                            loading="lazy"
                          >
                        `
                        : `
                          <div class="rich-modal__similar-placeholder">
                          </div>
                        `
                    }

                    <strong>
                      ${escapeHtml(
                        similar.title
                      )}
                    </strong>

                    <span>
                      ${escapeHtml(
                        [
                          similar.year,
                          similar.rating
                            ? `★ ${similar.rating}`
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' · ')
                      )}
                    </span>

                  </div>
                `
              )
              .join('')}
          </div>
        </section>
      `;
    };


  // =====================================================
  // HERO
  // =====================================================

  const title =
    escapeHtml(
      item.title || ''
    );

  const originalTitle =
    item.originalTitle &&
    item.originalTitle !==
      item.title
      ? escapeHtml(
          item.originalTitle
        )
      : '';


  const runtime =
    item.type === 'movie'
      ? formatRuntime(
          item.runtime
        )
      : item.type === 'series' &&
          item.episodes
        ? `${item.episodes} эп.`
        : '';


  const heroMeta =
    [
      item.year,
      runtime,
    ]
      .filter(Boolean)
      .join(' · ');


  const poster =
    item.poster
      ? `
        <img
          class="rich-modal__poster"
          src="${item.poster}"
          alt="${title}"
        >
      `
      : `
        <div class="rich-modal__poster rich-modal__poster--placeholder">
          ${escapeHtml(
            (item.title || '?')[0]
          )}
        </div>
      `;


  modalEl.innerHTML = `

    <button
      class="modal__close rich-modal__close"
      type="button"
      data-action="close"
      aria-label="Закрыть"
    >
      &times;
    </button>


    <section class="rich-modal__hero">

      ${
        item.backdrop
          ? `
            <img
              class="rich-modal__backdrop"
              src="${item.backdrop}"
              alt=""
            >
          `
          : ''
      }


      <div class="rich-modal__hero-overlay"></div>


      <div class="rich-modal__hero-content">

        <div class="rich-modal__poster-wrap">
          ${poster}
        </div>


        <div class="rich-modal__hero-info">

          <span class="rich-modal__type">
            ${escapeHtml(
              TYPE_LABELS[item.type] ||
              item.type
            )}
          </span>


          <h2>
            ${title}
          </h2>


          ${
            originalTitle
              ? `
                <p class="rich-modal__original">
                  ${originalTitle}
                </p>
              `
              : ''
          }


          ${
            heroMeta
              ? `
                <p class="rich-modal__meta">
                  ${escapeHtml(
                    heroMeta
                  )}
                </p>
              `
              : ''
          }


          <div class="rich-modal__ratings">

            ${renderRating(
              item.rating,
              'База данных'
            )}

            ${renderRating(
              record?.userRating,
              'Моя оценка',
              'rich-modal__rating--user'
            )}

          </div>


          ${renderGenres()}

        </div>

      </div>

    </section>


    <div class="rich-modal__body">


      ${
        item.description
          ? `
            <section class="rich-modal__section rich-modal__section--description">

              <h3>
                О произведении
              </h3>

              <p>
                ${escapeHtml(
                  item.description
                )}
              </p>

            </section>
          `
          : ''
      }


      ${renderFacts()}


      ${renderCast()}


      ${renderProviders()}


      <section class="rich-modal__section rich-modal__library">

        <div class="rich-modal__library-header">

          <div>
            <h3>
              Моя библиотека
            </h3>

            ${
              inLibrary &&
              record?.status
                ? `
                  <span class="rich-modal__library-status">
                    ${
                      STATUS_LABELS[
                        record.status
                      ] ||
                      record.status
                    }
                  </span>
                `
                : ''
            }

          </div>

        </div>


        <form
          class="modal__form"
          id="modal-form"
        >

          <label>

            Статус

            <select name="status">

              ${Object.entries(
                STATUS_LABELS
              )
                .map(
                  ([value, label]) => `
                    <option
                      value="${value}"
                      ${
                        record?.status ===
                        value
                          ? 'selected'
                          : ''
                      }
                    >
                      ${label}
                    </option>
                  `
                )
                .join('')}

            </select>

          </label>


          <fieldset class="rating-field">

            <legend>
              Моя оценка
            </legend>


            <div
              class="star-rating"
              role="radiogroup"
              aria-label="Моя оценка от 1 до 10"
            >

              ${Array.from(
                { length: 10 },
                (_, index) => {
                  const value =
                    index + 1;

                  const checked =
                    Number(
                      record?.userRating
                    ) === value;

                  return `
                    <button
                      type="button"
                      class="star-rating__star${
                        checked
                          ? ' is-active'
                          : ''
                      }"
                      data-rating="${value}"
                      role="radio"
                      aria-checked="${checked}"
                      aria-label="${value} из 10"
                    >
                      ★
                    </button>
                  `;
                }
              ).join('')}

            </div>


            <input
              type="hidden"
              name="userRating"
              value="${
                record?.userRating ?? ''
              }"
            >

          </fieldset>


          <label>

            Заметка

            <textarea
              name="note"
              rows="3"
            >${escapeHtml(
              record?.note ?? ''
            )}</textarea>

          </label>


          <div class="modal__actions">

            <button
              type="submit"
              class="button button--primary"
            >
              ${
                inLibrary
                  ? 'Сохранить'
                  : 'Добавить в библиотеку'
              }
            </button>


            ${
              inLibrary
                ? `
                  <button
                    type="button"
                    class="button button--danger"
                    data-action="remove"
                  >
                    Удалить
                  </button>
                `
                : ''
            }

          </div>

        </form>

      </section>


      ${renderSimilar()}

    </div>
  `;


  // =====================================================
  // CLOSE
  // =====================================================

  function handleOverlayClick(e) {
    if (
      e.target ===
      overlayEl
    ) {
      close();
    }
  }


  const close =
    () => {
      overlayEl.hidden =
        true;

      overlayEl.removeEventListener(
        'click',
        handleOverlayClick
      );

      modalEl.innerHTML =
        '';
    };


  modalEl
    .querySelector(
      '[data-action="close"]'
    )
    .addEventListener(
      'click',
      close
    );


  overlayEl.addEventListener(
    'click',
    handleOverlayClick
  );


  // =====================================================
  // RATING
  // =====================================================

  const ratingInput =
    modalEl.querySelector(
      'input[name="userRating"]'
    );


  const ratingStars =
    modalEl.querySelectorAll(
      '.star-rating__star'
    );


  ratingStars.forEach(
    star => {
      star.addEventListener(
        'click',
        () => {

          const rating =
            Number(
              star.dataset.rating
            );

          ratingInput.value =
            rating;


          ratingStars.forEach(
            current => {

              const value =
                Number(
                  current.dataset.rating
                );

              current.classList.toggle(
                'is-active',
                value <= rating
              );

              current.setAttribute(
                'aria-checked',
                value === rating
                  ? 'true'
                  : 'false'
              );
            }
          );
        }
      );
    }
  );


  // =====================================================
  // SAVE
  // =====================================================

  modalEl
    .querySelector(
      '#modal-form'
    )
    .addEventListener(
      'submit',
      async event => {

        event.preventDefault();

        const formData =
          new FormData(
            event.currentTarget
          );


        const changes = {
          status:
            formData.get(
              'status'
            ),

          userRating:
            formData.get(
              'userRating'
            )
              ? Number(
                  formData.get(
                    'userRating'
                  )
                )
              : null,

          note:
            String(
              formData.get(
                'note'
              ) || ''
            ).trim(),
        };


        if (inLibrary) {
          await onSave(
            changes
          );
        } else {
          await onAdd(
            changes
          );
        }

      }
    );


  // =====================================================
  // REMOVE
  // =====================================================

  const removeButton =
    modalEl.querySelector(
      '[data-action="remove"]'
    );


  if (removeButton) {

    removeButton.addEventListener(
      'click',
      async () => {

        await onRemove();

      }
    );

  }


  overlayEl.hidden =
    false;
}
