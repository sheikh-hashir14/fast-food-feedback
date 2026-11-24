

(() => {
  // ------------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------------
  const state = {
    outlets: [],
    items: [],
    activeOutletId: 0,
    search: '',
    category: 'all',
    maxPrice: 0,
    sort: 'rating',
    openItem: null,
    deviceId: '',
    submitting: false,
    itemsRequestId: 0,
    reviewsRequestId: 0
  };

  const dom = {};

  /** Comparators for the "Sort by" select. */
  const SORTS = {
    rating: (a, b) =>
      Number(b.rating) - Number(a.rating) ||
      a.name.localeCompare(b.name),
    'price-asc': (a, b) => Number(a.price) - Number(b.price) || a.name.localeCompare(b.name),
    'price-desc': (a, b) => Number(b.price) - Number(a.price) || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name)
  };


  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Not being able to remember the name/device id is not fatal.
    }
  }


  function getOrCreateDeviceId() {
    const stored = readStorage(CONFIG.STORAGE.deviceIdKey);
    if (stored && /^[A-Za-z0-9-]{8,64}$/.test(stored)) return stored;

    const generated = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

    writeStorage(CONFIG.STORAGE.deviceIdKey, generated);
    return generated;
  }

  // ------------------------------------------------------------------------
  // Startup
  // ------------------------------------------------------------------------
  function init() {
    cacheDom();
    state.deviceId = getOrCreateDeviceId();

    // Show the "demo mode" badge only when mock data is active.
    dom.dataMode.hidden = !CONFIG.USE_MOCK_DATA;

    // Filters are collapsed on phones but should be open on a wide screen.
    if (window.matchMedia('(min-width: 760px)').matches) {
      dom.filterDetails.open = true;
    }

    const savedName = readStorage(CONFIG.STORAGE.nameKey);
    if (savedName) dom.nameInput.value = savedName;

    wireEvents();

    loadOutlets();
    loadItems(0);
    loadTopRated();
  }

  function cacheDom() {
    dom.dataMode = document.getElementById('data-mode');
    dom.searchInput = document.getElementById('search-input');
    dom.categoryFilter = document.getElementById('category-filter');
    dom.priceFilter = document.getElementById('price-filter');
    dom.sortFilter = document.getElementById('sort-filter');
    dom.resetFilters = document.getElementById('reset-filters');
    dom.filterDetails = document.getElementById('filter-details');
    dom.form = document.getElementById('review-form');
    dom.nameInput = document.getElementById('reviewer-name');
    dom.reviewText = document.getElementById('review-text');
    dom.dialog = document.getElementById('item-dialog');
  }

  function wireEvents() {
    // --- search (debounced so we do not re-render on every keystroke) ---
    let searchTimer = null;
    dom.searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = dom.searchInput.value.trim();
        renderFilteredItems();
      }, CONFIG.SEARCH_DEBOUNCE_MS);
    });

    // --- filters ---
    dom.categoryFilter.addEventListener('change', () => {
      state.category = dom.categoryFilter.value;
      renderFilteredItems();
    });

    dom.priceFilter.addEventListener('change', () => {
      state.maxPrice = Number(dom.priceFilter.value) || 0;
      renderFilteredItems();
    });

    dom.sortFilter.addEventListener('change', () => {
      state.sort = dom.sortFilter.value;
      renderFilteredItems();
    });

    dom.resetFilters.addEventListener('click', resetFilters);

    // --- form ---
    dom.form.addEventListener('submit', handleSubmit);

    dom.form.addEventListener('input', (event) => {
      UI.clearFieldError(event.target);
    });

    dom.reviewText.addEventListener('input', () => {
      UI.setCharCount(dom.reviewText.value.length);
    });

    // A closed dialog should forget which item was open and ignore late replies.
    dom.dialog.addEventListener('close', () => {
      state.openItem = null;
      state.reviewsRequestId += 1;
    });
  }

  // ------------------------------------------------------------------------
  // Loading data
  // ------------------------------------------------------------------------
  function totalItemCount() {
    return state.outlets.reduce((sum, outlet) => sum + Number(outlet.item_count || 0), 0);
  }

  async function loadOutlets() {
    UI.setOutletsLoading();

    try {
      const outlets = await Api.getOutlets();
      state.outlets = outlets;

      UI.renderOutlets(outlets, state.activeOutletId, totalItemCount(), selectOutlet);
      UI.setHeroStats(totalItemCount(), outlets.length);
    } catch (error) {
      state.outlets = [];
      UI.setOutletsMessage('Outlets could not load', error.message, 'Try again', loadOutlets);
      UI.setHeroText('Campus data is unavailable right now.');
    }
  }

  async function loadItems(outletId) {

    const requestId = ++state.itemsRequestId;
    state.items = [];

    updateMenuHeading();
    UI.setItemsLoading();
    UI.setResultsCount('');

    try {
      const items = await Api.getItems(outletId);
      if (requestId !== state.itemsRequestId) return;

      state.items = items;
      buildCategoryOptions(items);
      renderFilteredItems();
    } catch (error) {
      if (requestId !== state.itemsRequestId) return;

      UI.setItemsMessage('Menu could not load', error.message, 'Try again', () => loadItems(outletId));
    }
  }

  async function loadTopRated(options = {}) {
    if (!options.silent) UI.setTopRatedLoading();

    try {
      const items = await Api.getTopRated();
      UI.renderTopRated(items, openItem);
    } catch (error) {
      // A silent refresh (after posting a review) should not replace the
      // existing list with an error box.
      if (!options.silent) {
        UI.setTopRatedMessage('Top rated could not load', error.message, 'Try again', () => loadTopRated());
      }
    }
  }

  async function loadReviews(itemId) {
    const requestId = ++state.reviewsRequestId;
    UI.setReviewsLoading();

    try {
      const reviews = await Api.getReviews(itemId);
      if (requestId !== state.reviewsRequestId) return;
      UI.renderReviews(reviews);
    } catch (error) {
      if (requestId !== state.reviewsRequestId) return;
      UI.setReviewsMessage('Reviews could not load', error.message, 'Try again', () => loadReviews(itemId));
    }
  }

  // ------------------------------------------------------------------------
  // Outlets and menu
  // ------------------------------------------------------------------------
  function selectOutlet(outletId) {
    state.activeOutletId = outletId;

    // A category or price limit chosen for the previous menu may not exist in
    // the new one, so start from a clean scope. The search box is kept because
    // the student typed it on purpose.
    state.category = 'all';
    dom.categoryFilter.value = 'all';
    state.maxPrice = 0;
    dom.priceFilter.value = '0';

    // Re-render so the pressed state follows the selection.
    UI.renderOutlets(state.outlets, state.activeOutletId, totalItemCount(), selectOutlet);

    loadItems(state.activeOutletId);

    // On a phone the menu is below the outlets, so move the user there.
    if (window.matchMedia('(max-width: 759px)').matches) {
      document.getElementById('menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updateMenuHeading() {
    if (state.activeOutletId === 0) {
      UI.setMenuHeading('All items', 'Every item from every outlet.');
      return;
    }

    const outlet = state.outlets.find((entry) => entry.id === state.activeOutletId);
    UI.setMenuHeading(
      outlet ? outlet.name : 'Menu',
      outlet ? `Menu from ${outlet.name}.` : 'Menu for the selected outlet.'
    );
  }

  function buildCategoryOptions(items) {
    const previous = dom.categoryFilter.value;
    const categories = [...new Set(items.map((item) => item.category))].sort((a, b) => a.localeCompare(b));

    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All categories';
    dom.categoryFilter.replaceChildren(allOption);

    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      dom.categoryFilter.append(option);
    });

    // Keep the chosen category if the new menu still has it.
    const keepPrevious = categories.includes(previous);
    dom.categoryFilter.value = keepPrevious ? previous : 'all';
    state.category = dom.categoryFilter.value;
  }

  function resetFilters() {
    dom.searchInput.value = '';
    dom.categoryFilter.value = 'all';
    dom.priceFilter.value = '0';
    dom.sortFilter.value = 'rating';

    state.search = '';
    state.category = 'all';
    state.maxPrice = 0;
    state.sort = 'rating';

    renderFilteredItems();
  }

  // ------------------------------------------------------------------------
  // Filtering, sorting, rendering
  // ------------------------------------------------------------------------
  function getVisibleItems() {
    const query = state.search.toLowerCase();

    return state.items
      .filter((item) => state.category === 'all' || item.category === state.category)
      .filter((item) => state.maxPrice === 0 || Number(item.price) <= state.maxPrice)
      .filter((item) => {
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query) ||
          item.cafe.toLowerCase().includes(query)
        );
      })
      .sort(SORTS[state.sort] || SORTS.rating);
  }

  function renderFilteredItems() {
    const visible = getVisibleItems();
    UI.renderItems(visible, openItem);

    if (!state.items.length) {
      UI.setResultsCount('No items to show.');
    } else {
      UI.setResultsCount(`Showing ${visible.length} of ${state.items.length} items.`);
    }
  }

  // ------------------------------------------------------------------------
  // Item dialog
  // ------------------------------------------------------------------------
  function openItem(item) {
    state.openItem = item;
    UI.openDialog(item);

    // openDialog() resets the form, so put the remembered name back.
    const savedName = readStorage(CONFIG.STORAGE.nameKey);
    if (savedName && !dom.nameInput.value) dom.nameInput.value = savedName;

    loadReviews(item.id);
  }

  // ------------------------------------------------------------------------
  // Review form
  // ------------------------------------------------------------------------
  function readFormValues() {
    const data = new FormData(dom.form);

    return {
      item_id: state.openItem ? state.openItem.id : 0,
      rating: Number(data.get('rating')) || 0,
      reviewer_name: String(data.get('reviewer_name') || '').trim(),
      review_text: String(data.get('review_text') || '').trim(),
      website: String(data.get('website') || '')
    };
  }

  /** Client-side rules. The backend checks all of this again. */
  function validateValues(values) {
    const errors = {};
    const { NAME_MIN, NAME_MAX, REVIEW_MAX } = CONFIG.LIMITS;

    if (!Number.isInteger(values.rating) || values.rating < 1 || values.rating > 5) {
      errors.rating = 'Choose a rating from 1 to 5 stars.';
    }

    if (!values.reviewer_name) {
      errors.reviewer_name = 'Please enter your name.';
    } else if (values.reviewer_name.length < NAME_MIN) {
      errors.reviewer_name = `Name must be at least ${NAME_MIN} characters.`;
    } else if (values.reviewer_name.length > NAME_MAX) {
      errors.reviewer_name = `Name must be ${NAME_MAX} characters or fewer.`;
    }

    if (values.review_text.length > REVIEW_MAX) {
      errors.review_text = `Review must be ${REVIEW_MAX} characters or fewer.`;
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Belt and braces: the disabled button should already stop this.
    if (state.submitting) return;

    if (!state.openItem) {
      UI.setFormStatus('Open an item before posting a review.', 'error');
      return;
    }

    const values = readFormValues();
    const errors = validateValues(values);
    UI.showFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    // Honeypot filled in: almost certainly a bot. Do not send it.
    if (values.website) {
      UI.setFormStatus('Your review could not be submitted. Please try again.', 'error');
      return;
    }

    state.submitting = true;
    UI.setSubmitting(true);
    UI.setFormStatus('', '');

    try {
      const result = await Api.createReview({
        item_id: values.item_id,
        reviewer_name: values.reviewer_name,
        rating: values.rating,
        review_text: values.review_text,
        device_id: state.deviceId,
        website: values.website
      });

      // The backend returns the saved review and the recalculated item summary.
      state.openItem = result.item;
      updateItem(result.item);

      UI.updateDialogHeader(result.item);
      UI.prependReview(result.review);
      UI.resetFormAfterSubmit();
      dom.form.elements.item_id.value = result.item.id;
      dom.nameInput.value = values.reviewer_name;
      UI.setFormStatus('Thanks! Your review is now visible to everyone.', 'success');

      writeStorage(CONFIG.STORAGE.nameKey, values.reviewer_name);

      // Ratings changed, so the top-rated list may have changed too.
      loadTopRated({ silent: true });
    } catch (error) {
      UI.setFormStatus(error.message, 'error');
    } finally {
      state.submitting = false;
      UI.setSubmitting(false);
    }
  }

  /** Keep the card in the menu in sync after a new review. */
  function updateItem(updatedItem) {
    state.items = state.items.map((item) =>
      item.id === updatedItem.id ? { ...item, ...updatedItem } : item
    );
    renderFilteredItems();
  }

  // ------------------------------------------------------------------------
  // Go
  // ------------------------------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
