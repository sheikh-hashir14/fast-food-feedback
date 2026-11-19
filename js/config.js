/* ==========================================================================
   config.js
   The ONLY file that knows where the backend lives. Change the URLs here.
   Loaded first, so every other script can read the global CONFIG object.
   ========================================================================== */

const CONFIG = {
  /**
   * true  -> use the built-in mock data in api.js (no n8n, no internet).
   * false -> call the n8n webhooks below.
   */
  USE_MOCK_DATA: true,

  /** Paste the production webhook URLs from n8n here (see n8n/n8n-setup.md). */
  API: {
    outlets: 'http://YOUR-N8N-HOST:5678/webhook/campus-food/outlets',
    items: 'http://YOUR-N8N-HOST:5678/webhook/campus-food/items',
    reviews: 'http://YOUR-N8N-HOST:5678/webhook/campus-food/reviews',
    topRated: 'http://YOUR-N8N-HOST:5678/webhook/campus-food/top-rated',
    createReview: 'http://YOUR-N8N-HOST:5678/webhook/campus-food/reviews'
  },

  /** Frontend limits. The backend enforces the same values again. */
  LIMITS: {
    NAME_MIN: 2,
    NAME_MAX: 30,
    REVIEW_MAX: 300,
    REVIEWS_PER_HOUR: 10
  },

  TOP_RATED_LIMIT: 5,
  REQUEST_TIMEOUT_MS: 12000,
  SEARCH_DEBOUNCE_MS: 300,

  /** Keys used in localStorage. */
  STORAGE: {
    deviceIdKey: 'cfr_device_id',
    nameKey: 'cfr_reviewer_name'
  }
};
