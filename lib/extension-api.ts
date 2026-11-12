import { browser } from 'wxt/browser';

/** Chrome is our supported host. Prefer its stable callback API even when
 * a newer Chrome also exposes a separate Promise-oriented browser namespace. */
export function extensionApi(): typeof browser {
  const chrome = (globalThis as unknown as { chrome?: typeof browser }).chrome;
  return chrome?.runtime?.id ? chrome : browser;
}
