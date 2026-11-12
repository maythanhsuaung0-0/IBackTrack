import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { Repository } from '../lib/storage';

export default defineBackground(() => {
  const repository = new Repository({
    async get(key) {
      return (await browser.storage.local.get(key))[key];
    },
    async set(key, value) {
      await browser.storage.local.set({ [key]: value });
    },
    async bytes() {
      return browser.storage.local.getBytesInUse(null);
    },
  });
  browser.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== browser.runtime.id || message?.channel !== 'backtrack')
      return;
    void repository.execute(message.command).then(
      (state) => reply({ ok: true, state }),
      (error: unknown) =>
        reply({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : 'Backtrack could not save. Try again.',
        }),
    );
    return true;
  });
});
