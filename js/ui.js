
const UI = (() => {
  // Cached elements. This script is loaded at the end of <body>, so they exist.
  const dom = {
    heroStats: document.getElementById('hero-stats'),
    topList: document.getElementById('top-rated-list'),
    outletList: document.getElementById('outlet-list'),
    itemList: document.getElementById('item-list'),
    resultsCount: document.getElementById('results-count'),
    menuTitle: document.getElementById('menu-title'),
    menuSub: document.getElementById('menu-sub'),
    dialog: document.getElementById('item-dialog'),
    dialogClose: document.getElementById('dialog-close'),
    dialogOutlet: document.getElementById('dialog-outlet'),
    dialogTitle: document.getElementById('dialog-title'),
    dialogMeta: document.getElementById('dialog-meta'),
    dialogRating: document.getElementById('dialog-rating'),
    reviewList: document.getElementById('review-list'),
    form: document.getElementById('review-form'),
    formStatus: document.getElementById('form-status'),
    submitButton: document.getElementById('submit-review'),
    reviewCount: document.getElementById('review-count')
  };

  /** Which element shows which error message. */
  const FIELDS = {
    rating: { errorId: 'rating-error' },
    reviewer_name: { errorId: 'name-error', inputId: 'reviewer-name' },
    review_text: { errorId: 'review-error', inputId: 'review-text' }
  };

  // Local fallback for any missing or broken image (see images/README.md).
  const FALLBACK_IMAGE = 'images/ui/placeholder.svg';

  // ------------------------------------------------------------------------
  // Tiny DOM helpers
  // ------------------------------------------------------------------------
  function el(tag, options = {}, children = []) {
    const node = document.createElement(tag);

    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;

    if (options.attrs) {
      Object.entries(options.attrs).forEach(([name, value]) => {
        if (value !== null && value !== undefined) node.setAttribute(name, value);
      });
    }

    // append() turns strings into text nodes, which is safe for user content.
    [].concat(children).forEach((child) => {
      if (child !== null && child !== undefined) node.append(child);
    });

    return node;
  }

  function clear(node) {
    node.replaceChildren();
  }

  /**
   * Build an <img> safely. src and alt are set as properties (never through
   * HTML), and a failed load swaps in the local placeholder once.
   */
  function createImage(src, alt, className) {
    const img = document.createElement('img');
    img.src = src || FALLBACK_IMAGE;
    img.alt = alt;
    if (className) img.className = className;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      if (img.dataset.fallbackApplied === 'true') return;
      img.dataset.fallbackApplied = 'true';
      img.src = FALLBACK_IMAGE;
    });
    return img;
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 'Rs -';
    return `Rs ${number.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }


    function ratingRow(average) {
    const rating = Number(average) || 0;
    const filled = Math.round(rating);
    const stars = el('span', { className: 'stars', attrs: { 'aria-hidden': 'true' } });

    for (let index = 1; index <= 5; index += 1) {
      stars.append(el('span', {
        className: index <= filled ? 'star is-on' : 'star',
        text: '\u2605'
      }));
    }

    const visibleValue = rating > 0 ? rating.toFixed(1) : 'No ratings yet';
    const spokenValue = rating > 0 ? `Rated ${rating.toFixed(1)} out of 5` : 'No ratings yet';

    return el('span', { className: 'rating' }, [
      stars,
      el('span', { className: 'rating-value', attrs: { 'aria-hidden': 'true' }, text: visibleValue }),
      el('span', { className: 'sr-only', text: spokenValue })
    ]);
  }

  function sectionMessage(title, text, actionLabel, onAction, illustration = null) {
    const children = [];

    if (illustration) {
      children.push(createImage(illustration.src, illustration.alt, 'state-illustration'));
    }

    children.push(el('strong', { text: title }), el('p', { text }));

    const box = el('div', { className: 'state-box' }, children);

    if (actionLabel && typeof onAction === 'function') {
      const button = el('button', {
        className: 'btn btn-secondary',
        attrs: { type: 'button' },
        text: actionLabel
      });
      button.addEventListener('click', onAction);
      box.append(button);
    }

    return box;
  }

  function skeletonCard() {
    return el('div', { className: 'card skeleton-card', attrs: { 'aria-hidden': 'true' } }, [
      el('div', { className: 'skeleton-line' }),
      el('div', { className: 'skeleton-line short' }),
      el('div', { className: 'skeleton-line tiny' })
    ]);
  }

  function showSkeletons(container, amount) {
    clear(container);
    for (let index = 0; index < amount; index += 1) {
      container.append(skeletonCard());
    }
  }

  // ------------------------------------------------------------------------
  // Hero and headings
  // ------------------------------------------------------------------------
  function setHeroStats(itemCount, outletCount) {
    if (!outletCount) {
      dom.heroStats.textContent = 'No campus data available yet.';
      return;
    }
    dom.heroStats.textContent =
      `${itemCount} items from ${outletCount} outlets \u00b7 ratings and reviews are shared`;
  }

  function setHeroText(text) {
    dom.heroStats.textContent = text;
  }

  function setMenuHeading(title, subtitle) {
    dom.menuTitle.textContent = title;
    dom.menuSub.textContent = subtitle;
  }

  function setResultsCount(text) {
    dom.resultsCount.textContent = text;
  }

  // ------------------------------------------------------------------------
  // Outlets
  // ------------------------------------------------------------------------
  function setOutletsLoading() {
    showSkeletons(dom.outletList, 4);
  }

  function setOutletsMessage(title, text, actionLabel, onAction) {
    clear(dom.outletList);
    dom.outletList.append(sectionMessage(title, text, actionLabel, onAction));
  }

  function renderOutlets(outlets, activeId, totalItems, onSelect) {
    clear(dom.outletList);

    const allOutlets = {
      id: 0,
      name: 'All outlets',
      typeLabel: 'Every menu',
      detail: `${totalItems} item${totalItems === 1 ? '' : 's'} across campus`
    };

    const cards = [allOutlets, ...outlets.map((outlet) => ({
      id: outlet.id,
      name: outlet.name,
      typeLabel: outlet.rating ? `\u2605 ${Number(outlet.rating).toFixed(1)}` : 'No ratings yet',
      detail: outlet.location || ''
    }))];

    cards.forEach((card) => {
      const pressed = Number(activeId) === String(card.id);
      const button = el('button', {
        className: 'outlet-card',
        attrs: { type: 'button' }
      }, [
        el('span', { className: 'outlet-name', text: card.name }),
        el('span', { className: 'outlet-type', text: card.typeLabel }),
        el('span', { className: 'outlet-meta', text: card.detail })
      ]);

      button.addEventListener('click', () => onSelect(card.id, card.name));
      dom.outletList.append(button);
    });
  }

  // ------------------------------------------------------------------------
  // Items
  // ------------------------------------------------------------------------
  function setItemsLoading() {
    showSkeletons(dom.itemList, 6);
  }

  function setItemsMessage(title, text, actionLabel, onAction) {
    clear(dom.itemList);
    dom.itemList.append(sectionMessage(title, text, actionLabel, onAction));
  }

  function itemCard(item, onOpen) {
    const button = el('button', {
      className: 'btn btn-secondary',
      attrs: { type: 'button' },
      text: 'Read reviews & rate'
    });
    button.addEventListener('click', () => onOpen(item));

    return el('article', { className: 'card item-card' }, [
      el('div', { className: 'item-top' }, [
        el('h3', { text: item.name }),
        el('p', { className: 'item-price', text: formatPrice(item.price) })
      ]),
      el('p', { className: 'item-meta', text: item.cafe }),
      ratingRow(item.rating),
      button
    ]);
  }

  function renderItems(items, onOpen) {
    clear(dom.itemList);

    if (!items.length) {
      dom.itemList.append(sectionMessage(
        'No items match',
        'Try a different search word, category or price limit.'
      ));
      return;
    }

    items.forEach((item) => dom.itemList.append(itemCard(item, onOpen)));
  }

  // ------------------------------------------------------------------------
  // Top rated
  // ------------------------------------------------------------------------
  function setTopRatedLoading() {
    showSkeletons(dom.topList, 3);
  }

  function setTopRatedMessage(title, text, actionLabel, onAction) {
    clear(dom.topList);
    dom.topList.append(sectionMessage(title, text, actionLabel, onAction));
  }

  function renderTopRated(items, onOpen) {
    clear(dom.topList);

    if (!items.length) {
      dom.topList.append(sectionMessage(
        'No ratings yet',
        'Be the first to rate an item and it will show up here.'
      ));
      return;
    }

    items.forEach((item, index) => {
      const button = el('button', {
        className: 'btn btn-ghost',
        attrs: { type: 'button' },
        text: 'See reviews'
      });
      button.addEventListener('click', () => onOpen(item));

      dom.topList.append(el('article', { className: 'card top-card' }, [
        el('span', { className: 'rank', text: `#${index + 1} top rated` }),
        el('h3', { text: item.name }),
        el('p', { className: 'item-outlet', text: item.cafe }),
        el('p', { className: 'price', text: formatPrice(item.price) }),
        ratingRow(item.rating),
        button
      ]));
    });
  }

  // ------------------------------------------------------------------------
  // Dialog
  // ------------------------------------------------------------------------
  function updateDialogHeader(item) {
    dom.dialogOutlet.textContent = item.cafe;
    dom.dialogTitle.textContent = item.name;
    dom.dialogMeta.textContent = formatPrice(item.price);

    clear(dom.dialogRating);
    if (Number(item.rating) > 0) {
      dom.dialogRating.append(
        document.createTextNode('Average rating: '),
        ratingRow(item.rating)
      );
    } else {
      dom.dialogRating.textContent = 'No ratings yet - be the first!';
    }
  }

  function openDialog(item) {
    updateDialogHeader(item);

    clear(dom.reviewList);
    dom.reviewList.append(el('li', { className: 'state-box', text: 'Loading reviews...' }));

    dom.form.reset();
    clearFormErrors();
    setFormStatus('', '');
    setCharCount(0);
    setSubmitting(false);
    dom.form.elements.item_id.value = item.id;

    if (!dom.dialog.open) dom.dialog.showModal();
  }

  function closeDialog() {
    if (dom.dialog.open) dom.dialog.close();
  }

  // ------------------------------------------------------------------------
  // Reviews
  // ------------------------------------------------------------------------
  function reviewItem(review) {
    const name = String(review.reviewer_name || 'Student').trim() || 'Student';
    const text = String(review.text || '');
    const rating = Number(review.rating) || 0;
    const stars = '\u2605'.repeat(rating) + '\u2606'.repeat(Math.max(0, 5 - rating));

    return el('li', { className: 'review' }, [
      el('div', { className: 'review-head' }, [
        el('span', { className: 'review-avatar', attrs: { 'aria-hidden': 'true' }, text: name.charAt(0).toUpperCase() }),
        el('div', { className: 'review-who' }, [
          el('p', { className: 'review-name', text: name })
        ]),
        el('span', { className: 'review-stars', attrs: { 'aria-hidden': 'true' }, text: stars }),
        el('span', { className: 'sr-only', text: `${rating} out of 5 stars` })
      ]),
      el('p', {
        className: text ? 'review-text' : 'review-text is-empty',
        text: text || 'Rated without a written review.'
      })
    ]);
  }

  function setReviewsLoading() {
    clear(dom.reviewList);
    dom.reviewList.append(el('li', { className: 'state-box', text: 'Loading reviews...' }));
  }

  function setReviewsMessage(title, text, actionLabel, onAction) {
    clear(dom.reviewList);

    const box = sectionMessage(title, text, actionLabel, onAction);
    const listItem = el('li');
    listItem.append(box);
    dom.reviewList.append(listItem);
  }

  function renderReviews(reviews) {
    clear(dom.reviewList);

    if (!reviews.length) {
      dom.reviewList.append(el('li', { className: 'state-box' }, [
        el('strong', { text: 'No reviews yet' }),
        el('p', { text: 'Be the first to rate this item.' })
      ]));
      return;
    }

    reviews.forEach((review) => dom.reviewList.append(reviewItem(review)));
  }

  function prependReview(review) {
    // Remove an empty/loading placeholder before adding the new review.
    const placeholder = dom.reviewList.querySelector('.state-box');
    if (placeholder) placeholder.closest('li').remove();

    dom.reviewList.prepend(reviewItem(review));
  }

  // ------------------------------------------------------------------------
  // Form helpers
  // ------------------------------------------------------------------------
  function setFormStatus(message, type) {
    dom.formStatus.textContent = message;
    dom.formStatus.classList.remove('is-success', 'is-error');
    if (type === 'success') dom.formStatus.classList.add('is-success');
    if (type === 'error') dom.formStatus.classList.add('is-error');
  }

  function setSubmitting(isSubmitting) {
    dom.submitButton.disabled = isSubmitting;
    dom.submitButton.textContent = isSubmitting ? 'Posting...' : 'Post review';
  }

  function setCharCount(length) {
    dom.reviewCount.textContent = String(length);
  }

  function clearFormErrors() {
    Object.values(FIELDS).forEach((field) => {
      const error = document.getElementById(field.errorId);
      if (error) error.textContent = '';
      if (field.inputId) {
        const input = document.getElementById(field.inputId);
        if (input) input.removeAttribute('aria-invalid');
      }
    });

    // Radios share one group, so clear the flag on all of them.
    dom.form.querySelectorAll('input[name="rating"]').forEach((radio) => {
      radio.removeAttribute('aria-invalid');
    });
  }

  function showFieldErrors(errors) {
    clearFormErrors();

    Object.entries(errors).forEach(([name, message]) => {
      const field = FIELDS[name];
      if (!field) return;

      const error = document.getElementById(field.errorId);
      if (error) error.textContent = message;

      if (field.inputId) {
        const input = document.getElementById(field.inputId);
        if (input) input.setAttribute('aria-invalid', 'true');
      }
    });

    // The star widget is a radio group: flag every radio in the group.
    if (errors.rating) {
      dom.form.querySelectorAll('input[name="rating"]').forEach((radio) => {
        radio.setAttribute('aria-invalid', 'true');
      });
    }

    // Move focus to the first problem so keyboard and screen reader users
    // do not have to hunt for the error.
    if (errors.rating) {
      const firstStar = dom.form.querySelector('input[name="rating"]');
      if (firstStar) firstStar.focus();
    } else if (errors.reviewer_name) {
      document.getElementById('reviewer-name').focus();
    } else if (errors.review_text) {
      document.getElementById('review-text').focus();
    }
  }

  function clearFieldError(input) {
    if (!input || !input.name) return;
    const field = FIELDS[input.name];
    if (!field) return;

    const error = document.getElementById(field.errorId);
    if (error) error.textContent = '';

    if (input.name === 'rating') {
      dom.form.querySelectorAll('input[name="rating"]').forEach((radio) => {
        radio.removeAttribute('aria-invalid');
      });
      return;
    }

    input.removeAttribute('aria-invalid');
  }

  function resetFormAfterSubmit() {
    dom.form.reset();
    clearFormErrors();
    setCharCount(0);
  }

  // Close the dialog from the X button or a click on the backdrop.
  dom.dialogClose.addEventListener('click', closeDialog);
  dom.dialog.addEventListener('click', (event) => {
    if (event.target === dom.dialog) closeDialog();
  });

  return {
    // hero / headings
    setHeroStats,
    setHeroText,
    setMenuHeading,
    setResultsCount,
    // outlets
    setOutletsLoading,
    setOutletsMessage,
    renderOutlets,
    // items
    setItemsLoading,
    setItemsMessage,
    renderItems,
    // top rated
    setTopRatedLoading,
    setTopRatedMessage,
    renderTopRated,
    // dialog
    openDialog,
    closeDialog,
    updateDialogHeader,
    // reviews
    setReviewsLoading,
    setReviewsMessage,
    renderReviews,
    prependReview,
    // form
    setFormStatus,
    setSubmitting,
    setCharCount,
    showFieldErrors,
    clearFieldError,
    resetFormAfterSubmit
  };
})();
