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


// =========================================================
// COMMON
// =========================================================

function escapeHtml(value) {
  const div =
    document.createElement('div');

  div.textContent =
    value ?? '';

  return div.innerHTML;
}


function secondaryLine(item) {
  if (
    item.type === 'movie' &&
    item.runtime
  ) {
    return `${item.runtime} мин`;
  }

  if (
    (
      item.type === 'series' ||
      item.type === 'anime'
    ) &&
    item.episodes
  ) {
    return `${item.episodes} эп`;
  }

  if (
    item.type === 'game' &&
    item.playtime
  ) {
    return `${item.playtime}ч`;
  }

  return '';
}


function genresLine(item) {
  if (
    !Array.isArray(item.genres) ||
    !item.genres.length
  ) {
    return '';
  }

  return item.genres
    .slice(0, 2)
    .join(' · ');
}


function metaLine(item) {
  return [
    item.year,
    secondaryLine(item),
  ]
    .filter(Boolean)
    .join(' · ');
}


function activateOnKeyboard(
  element,
  callback
) {
  element.addEventListener(
    'click',
    callback
  );

  element.addEventListener(
    'keydown',
    event => {
      if (
        event.key !== 'Enter' &&
        event.key !== ' '
      ) {
        return;
      }

      event.preventDefault();
      callback();
    }
  );
}


function posterMarkup(
  item,
  className = 'card__poster'
) {
  if (item.poster) {
    return `
      <img
        class="${className}"
        src="${item.poster}"
        alt="${escapeHtml(item.title)}"
        loading="lazy"
      >
    `;
  }

  return `
    <div class="${className} ${className}--placeholder">
      ${escapeHtml(
        (item.title || '?')[0]
      )}
    </div>
  `;
}


function ratingMarkup(
  value,
  className,
  label
) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  return `
    <span class="${className}">
      ★ ${escapeHtml(value)}
      <small>${label}</small>
    </span>
  `;
}


// =========================================================
// GRID / LIST
// =========================================================

export function renderGrid(
  container,
  items,
  { onSelect } = {}
) {
  container.classList.remove(
    'card-grid--list'
  );

  container.classList.add(
    'card-grid'
  );

  container.innerHTML = '';

  if (!items.length) {
    renderEmptyState(
      container,
      'Здесь пока ничего нет.'
    );

    return;
  }

  const fragment =
    document.createDocumentFragment();

  items.forEach(item =>
    fragment.appendChild(
      renderCard(
        item,
        onSelect
      )
    )
  );

  container.appendChild(fragment);
}


export function renderList(
  container,
  items,
  { onSelect } = {}
) {
  container.classList.remove(
    'card-grid'
  );

  container.classList.add(
    'card-grid--list'
  );

  container.innerHTML = '';

  if (!items.length) {
    renderEmptyState(
      container,
      'Здесь пока ничего нет.'
    );

    return;
  }

  const fragment =
    document.createDocumentFragment();

  items.forEach(item => {
    const row =
      document.createElement('article');

    row.className =
      'library-list-item';

    row.tabIndex = 0;

    const note =
      item.note?.trim()
        ? `
          <span class="library-list-item__note">
            ${escapeHtml(
              item.note.trim()
            )}
          </span>
        `
        : '';

    row.innerHTML = `
      <div class="library-list-item__poster">
        ${
          item.poster
            ? `
              <img
                src="${item.poster}"
                alt=""
                loading="lazy"
              >
            `
            : `
              <span>
                ${escapeHtml(
                  (item.title || '?')[0]
                )}
              </span>
            `
        }
      </div>

      <div class="library-list-item__info">
        <span class="card__type">
          ${escapeHtml(
            TYPE_LABELS[item.type] ||
            item.type
          )}
        </span>

        <h3>
          ${escapeHtml(item.title)}
        </h3>

        <p>
          ${escapeHtml(
            metaLine(item)
          )}
        </p>

        ${
          genresLine(item)
            ? `
              <p class="card__genres">
                ${escapeHtml(
                  genresLine(item)
                )}
              </p>
            `
            : ''
        }

        ${note}
      </div>

      <div class="library-list-item__status">
        ${
          item.status
            ? `
              <span
                class="card__status card__status--${item.status}"
              >
                ${escapeHtml(
                  STATUS_LABELS[item.status] ||
                  item.status
                )}
              </span>
            `
            : ''
        }
      </div>

      <div class="library-list-item__ratings">
        ${
          ratingMarkup(
            item.rating,
            'library-list-item__rating',
            'БД'
          ) ||
          '<span class="library-list-item__rating library-list-item__empty">—</span>'
        }

        ${
          ratingMarkup(
            item.userRating,
            'library-list-item__rating library-list-item__rating--user',
            'Моя'
          ) ||
          '<span class="library-list-item__rating library-list-item__empty">—</span>'
        }
      </div>
    `;

    activateOnKeyboard(
      row,
      () =>
        onSelect?.(item)
    );

    fragment.appendChild(row);
  });

  container.appendChild(fragment);
}


function renderCard(
  item,
  onSelect
) {
  const card =
    document.createElement('article');

  card.className = 'card';
  card.tabIndex = 0;

  const genres =
    genresLine(item);

  card.innerHTML = `
    ${posterMarkup(item)}

    <div class="card__body">
      <span class="card__type">
        ${escapeHtml(
          TYPE_LABELS[item.type] ||
          item.type
        )}
      </span>

      <h3 class="card__title">
        ${escapeHtml(item.title)}
      </h3>

      <p class="card__meta">
        ${escapeHtml(
          metaLine(item)
        )}
      </p>

      ${
        genres
          ? `
            <p class="card__genres">
              ${escapeHtml(genres)}
            </p>
          `
          : ''
      }

      ${
        item.status
          ? `
            <span
              class="card__status card__status--${item.status}"
            >
              ${escapeHtml(
                STATUS_LABELS[item.status] ||
                item.status
              )}
            </span>
          `
          : ''
      }

      ${ratingMarkup(
        item.rating,
        'card__rating',
        'Оценка'
      )}

      ${ratingMarkup(
        item.userRating,
        'card__user-rating',
        'Моя оценка'
      )}

      ${
        item.note?.trim()
          ? `
            <p class="card__note">
              ${escapeHtml(
                item.note.trim()
              )}
            </p>
          `
          : ''
      }
    </div>
  `;

  activateOnKeyboard(
    card,
    () => onSelect?.(item)
  );

  return card;
}


export function renderEmptyState(
  container,
  message
) {
  container.innerHTML =
    `<p class="empty-state">${
      escapeHtml(message)
    }</p>`;
}


export function setActiveFilter(
  container,
  type
) {
  container
    .querySelectorAll('.type-filter')
    .forEach(button =>
      button.classList.toggle(
        'is-active',
        button.dataset.type === type
      )
    );
}


// =========================================================
// STATS
// =========================================================

export function renderStats(
  container,
  items
) {
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

  items.forEach(item => {
    if (
      stats[item.status] !==
      undefined
    ) {
      stats[item.status]++;
    }

    if (
      stats[item.type] !==
      undefined
    ) {
      stats[item.type]++;
    }
  });

  const cards = [
    ['total', 'Всего', true],
    ['completed', 'Завершено'],
    ['watching', 'Смотрю'],
    ['planned', 'Запланировано'],
    ['on_hold', 'На паузе'],
    ['dropped', 'Дропнуто'],
    ['movie', 'Фильмы', false, true],
    ['series', 'Сериалы', false, true],
    ['anime', 'Аниме', false, true],
    ['game', 'Игры', false, true],
  ];

  container.innerHTML =
    cards
      .map(
        ([
          key,
          label,
          main = false,
          type = false,
        ]) => `
          <div
            class="stats-card${
              main
                ? ' stats-card--main'
                : ''
            }${
              type
                ? ' stats-card--type'
                : ''
            }"
          >
            <strong>
              ${stats[key]}
            </strong>

            <span>
              ${label}
            </span>
          </div>
        `
      )
      .join('');
}


// =========================================================
// RANDOM
// =========================================================

export function openRandomChoice(
  overlayEl,
  modalEl,
  item,
  {
    onOpen,
    onAgain,
  } = {}
) {
  modalEl.classList.add(
    'modal--recommendation'
  );

  modalEl.innerHTML = `
    <button
      class="modal__close"
      type="button"
      data-action="close"
      aria-label="Закрыть"
    >
      &times;
    </button>

    <div class="recommendation-card">
      <p class="random-choice__eyebrow">
        А что если посмотреть это?
      </p>

      ${
        item.poster
          ? `
            <img
              class="random-choice__poster"
              src="${item.poster}"
              alt="${escapeHtml(
                item.title
              )}"
            >
          `
          : `
            <div
              class="random-choice__poster random-choice__poster--placeholder"
            >
              ${escapeHtml(
                (item.title || '?')[0]
              )}
            </div>
          `
      }

      <span class="card__type">
        ${escapeHtml(
          TYPE_LABELS[item.type] ||
          item.type
        )}
      </span>

      <h2>
        ${escapeHtml(item.title)}
      </h2>

      <p class="random-choice__meta">
        ${escapeHtml(
          [
            item.year,
            secondaryLine(item),
            item.status
              ? STATUS_LABELS[
                  item.status
                ] ||
                item.status
              : '',
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
    modalEl.classList.remove(
      'modal--recommendation'
    );
  };

  modalEl
    .querySelector(
      '[data-action="close"]'
    )
    .addEventListener(
      'click',
      close
    );

  modalEl
    .querySelector(
      '[data-action="open"]'
    )
    .addEventListener(
      'click',
      () => {
        close();
        onOpen?.(item);
      }
    );

  modalEl
    .querySelector(
      '[data-action="again"]'
    )
    .addEventListener(
      'click',
      () => onAgain?.()
    );

  overlayEl.hidden = false;
}


// =========================================================
// DETAIL MODAL
// =========================================================

export function openModal(
  overlayEl,
  modalEl,
  {
    item,
    record,
    onAdd,
    onSave,
    onRemove,
    onOpenItem,
  }
) {
  modalEl.classList.remove(
    'modal--recommendation'
  );

  const inLibrary =
    Boolean(record);

  const reyohohoUrl =
    item.title
      ? `https://dav2010id.github.io/reyohoho/#search=${encodeURIComponent(
          item.title
        )}`
      : 'https://dav2010id.github.io/reyohoho/';


  const formatRuntime =
    minutes => {
      if (!minutes) {
        return '';
      }

      const hours =
        Math.floor(minutes / 60);

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


  const renderGenres = () => {
    if (
      !Array.isArray(item.genres) ||
      !item.genres.length
    ) {
      return '';
    }

    return `
      <div class="rich-modal__genres">
        ${item.genres
          .map(
            genre => `
              <span class="rich-modal__genre">
                ${escapeHtml(genre)}
              </span>
            `
          )
          .join('')}
      </div>
    `;
  };


  const renderModalRating = (
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
      <div
        class="rich-modal__rating ${className}"
      >
        <strong>
          ★ ${escapeHtml(value)}
        </strong>

        <span>
          ${label}
        </span>
      </div>
    `;
  };


  const renderFacts = () => {
    const facts = [];

    if (item.countries?.length) {
      facts.push([
        'Страна',
        item.countries.join(', '),
      ]);
    }

    if (item.language) {
      facts.push([
        'Язык',
        item.language,
      ]);
    }

    if (
      item.budget &&
      item.type === 'movie'
    ) {
      facts.push([
        'Бюджет',
        item.budget,
      ]);
    }

    if (
      item.revenue &&
      item.type === 'movie'
    ) {
      facts.push([
        'Сборы',
        item.revenue,
      ]);
    }

    if (item.director) {
      facts.push([
        'Режиссёр',
        item.director,
      ]);
    }

    if (
      Array.isArray(item.writers) &&
      item.writers.length
    ) {
      facts.push([
        'Сценарий',
        item.writers.join(', '),
      ]);
    }

    if (
      item.type === 'series' &&
      item.episodes
    ) {
      facts.push([
        'Эпизодов',
        item.episodes,
      ]);
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
              ([label, value]) => `
                <div class="rich-modal__fact">
                  <span>
                    ${escapeHtml(label)}
                  </span>

                  <strong>
                    ${escapeHtml(
                      String(value)
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


  const renderCast = () => {
    if (
      !Array.isArray(item.cast) ||
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


  const renderRelatedGroup = (
    title,
    items
  ) => {
    if (
      !Array.isArray(items) ||
      !items.length
    ) {
      return '';
    }

    return `
      <section class="rich-modal__section">
        <h3>
          ${escapeHtml(title)}
        </h3>

        <div class="rich-modal__similar">
          ${items
            .map(
              related => `
                <div
                  class="rich-modal__similar-card"
                  data-similar-id="${escapeHtml(
                    String(
                      related.id
                    )
                  )}"
                  data-similar-provider="${escapeHtml(
                    String(
                      related.provider || ''
                    )
                  )}"
                  tabindex="0"
                  role="button"
                  aria-label="Открыть ${escapeHtml(
                    related.title
                  )}"
                >
                  ${
                    related.poster
                      ? `
                        <img
                          src="${related.poster}"
                          alt="${escapeHtml(
                            related.title
                          )}"
                          loading="lazy"
                        >
                      `
                      : `
                        <div class="rich-modal__similar-placeholder">
                          ${escapeHtml(
                            (
                              related.title ||
                              '?'
                            )[0]
                          )}
                        </div>
                      `
                  }

                  <strong>
                    ${escapeHtml(
                      related.title
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      [
                        related.year,
                        related.rating
                          ? `★ ${related.rating}`
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


  const title =
    escapeHtml(
      item.title || ''
    );

  const originalTitle =
    item.originalTitle &&
    item.originalTitle !== item.title
      ? escapeHtml(
          item.originalTitle
        )
      : '';

  const runtime =
    item.type === 'movie'
      ? formatRuntime(item.runtime)
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
    posterMarkup(
      item,
      'rich-modal__poster'
    );


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

          <h2>${title}</h2>

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
                  ${escapeHtml(heroMeta)}
                </p>
              `
              : ''
          }

          <div class="rich-modal__ratings">
            ${renderModalRating(
              item.rating,
              'База данных'
            )}

            ${renderModalRating(
              record?.userRating,
              'Моя оценка',
              'rich-modal__rating--user'
            )}
          </div>

          ${
            [
              'movie',
              'series',
              'anime',
            ].includes(item.type)
              ? `
                <a
                  class="button button--primary rich-modal__watch-button"
                  href="${reyohohoUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Смотреть ➤
                </a>
              `
              : ''
          }

          ${renderGenres()}
        </div>
      </div>
    </section>

    <div class="rich-modal__body">
      ${
        item.description
          ? `
            <section
              class="rich-modal__section rich-modal__section--description"
            >
              <h3>О произведении</h3>

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

      <section
        class="rich-modal__section rich-modal__library"
      >
        <div class="rich-modal__library-header">
          <div>
            <h3>Моя библиотека</h3>

            ${
              inLibrary &&
              record?.status
                ? `
                  <span class="rich-modal__library-status">
                    ${escapeHtml(
                      STATUS_LABELS[
                        record.status
                      ] ||
                      record.status
                    )}
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
                        record?.status === value
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
            <legend>Моя оценка</legend>

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

                  const selected =
                    Number(
                      record?.userRating
                    );

                  return `
                    <button
                      type="button"
                      class="star-rating__star${
                        selected >= value
                          ? ' is-active'
                          : ''
                      }"
                      data-rating="${value}"
                      role="radio"
                      aria-checked="${
                        selected === value
                      }"
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

      ${renderRelatedGroup(
        'Связанные фильмы',
        item.related
      )}

      ${renderRelatedGroup(
        'Похожие',
        item.similar
      )}
    </div>
  `;


  // =======================================================
  // MODAL EVENTS
  // =======================================================

  const close = () => {
    overlayEl.hidden = true;
    modalEl.innerHTML = '';
  };


  modalEl
    .querySelector(
      '[data-action="close"]'
    )
    .addEventListener(
      'click',
      close
    );


  const handleOverlayClick =
    event => {
      if (
        event.target ===
        overlayEl
      ) {
        close();
      }
    };


  overlayEl.addEventListener(
    'click',
    handleOverlayClick
  );


  modalEl
    .querySelectorAll(
      '[data-similar-id]'
    )
    .forEach(card => {
      activateOnKeyboard(
        card,
        async () => {
          if (
            typeof onOpenItem !==
            'function'
          ) {
            return;
          }

          const id =
            card.dataset.similarId;

          const provider =
            card.dataset.similarProvider;

          const source = [
            ...(item.related || []),
            ...(item.similar || []),
          ];

          const target =
            source.find(
              candidate =>
                String(
                  candidate.id
                ) === id &&
                String(
                  candidate.provider || ''
                ) === provider
            );

          if (!target) {
            return;
          }

          await onOpenItem(target);

          requestAnimationFrame(() => {
            modalEl.scrollTop = 0;
          });
        }
      );
    });


  // Rating

  const ratingInput =
    modalEl.querySelector(
      'input[name="userRating"]'
    );

  const ratingStars =
    modalEl.querySelectorAll(
      '.star-rating__star'
    );

  ratingStars.forEach(star => {
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
  });


  // Save

  const form =
    modalEl.querySelector(
      '#modal-form'
    );

  let isSubmitting = false;

  form.addEventListener(
    'submit',
    async event => {
      event.preventDefault();

      if (isSubmitting) {
        return;
      }

      isSubmitting = true;

      const submitButton =
        form.querySelector(
          'button[type="submit"]'
        );

      const originalText =
        submitButton.textContent;

      submitButton.disabled = true;

      submitButton.textContent =
        inLibrary
          ? 'Сохраняем…'
          : 'Добавляем…';

      const data =
        new FormData(form);

      const changes = {
        status:
          data.get('status'),

        userRating:
          data.get('userRating')
            ? Number(
                data.get('userRating')
              )
            : null,

        note:
          String(
            data.get('note') || ''
          ).trim(),
      };

      try {
        if (inLibrary) {
          await onSave(changes);
          return;
        }

        const success =
          await onAdd(changes);

        if (!success) {
          return;
        }

        close();

        showToast(
          `${
            item.title || 'Контент'
          } добавлен в библиотеку`,
          'Контент добавлен'
        );
      } catch (error) {
        console.error(
          '[modal] submit failed:',
          error
        );
      } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.textContent =
          originalText;
      }
    }
  );


  // Remove

  const removeButton =
    modalEl.querySelector(
      '[data-action="remove"]'
    );

  removeButton?.addEventListener(
    'click',
    async () => {
      if (isSubmitting) {
        return;
      }

      isSubmitting = true;
      removeButton.disabled = true;

      try {
        await onRemove();
      } finally {
        isSubmitting = false;
        removeButton.disabled = false;
      }
    }
  );


  overlayEl.hidden = false;
}


// =========================================================
// TOAST
// =========================================================

function showToast(
  message,
  title = 'Готово'
) {
  document
    .querySelector('.app-toast')
    ?.remove();

  const toast =
    document.createElement('div');

  toast.className =
    'app-toast';

  toast.setAttribute(
    'role',
    'status'
  );

  toast.innerHTML = `
    <span
      class="app-toast__mark"
      aria-hidden="true"
    >
      ✓
    </span>

    <span class="app-toast__content">
      <strong>
        ${escapeHtml(title)}
      </strong>

      <span>
        ${escapeHtml(message)}
      </span>
    </span>
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() =>
    toast.classList.add(
      'is-visible'
    )
  );

  setTimeout(() => {
    toast.classList.remove(
      'is-visible'
    );

    setTimeout(
      () => toast.remove(),
      220
    );
  }, 2600);
}