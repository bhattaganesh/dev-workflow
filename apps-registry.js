/**
 * App registry — controls start order and which modules are loaded.
 *
 * To add a new app:
 *   1. Create apps/your-app.js  (must export: name, key, start(config), stop(session, config))
 *   2. Add it to APP_KEYS in the order you want it to start
 *
 * work-end runs apps in reverse order automatically.
 */
export const APP_KEYS = [
  'local-wp',
  'chrome',
  'teams',
  'vscode',
];
