import { extensionApi } from './extension-api';
import type { Driver } from './storage';

/** Resolve only inside Chrome's completion callback, after checking lastError.
 * Do not time out/release a storage write here: a late write must stay serialized
 * with later writes. The content-script request has a separate UI deadline. */
export function chromeStorage(api = extensionApi()): Driver {
  function completion<T>(
    invoke: (done: (value: T) => void) => void,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        invoke((value) => {
          const error = api.runtime.lastError;
          if (error)
            reject(new Error(error.message ?? 'Chrome storage failed.'));
          else resolve(value);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  return {
    get: async (key) =>
      (
        await completion<Record<string, unknown>>((done) => {
          api.storage.local.get(key, done);
        })
      )[key],
    set: (key, value) =>
      completion<void>((done) => {
        api.storage.local.set({ [key]: value }, () => done());
      }),
    bytes: () =>
      completion<number>((done) => {
        api.storage.local.getBytesInUse(null, done);
      }),
  };
}
