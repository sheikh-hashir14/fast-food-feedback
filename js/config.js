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
  USE_MOCK_DATA: false,

  SUPABASE_URL: 'https://kkphrgjlxrcrhsgfhvhb.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_5fgh4nPbrWbpEzbDtogvHA_dc9pvJDU',

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
