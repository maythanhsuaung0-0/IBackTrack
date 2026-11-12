import { defineBackground } from 'wxt/utils/define-background';
import { Repository } from '../lib/storage';
import { extensionApi } from '../lib/extension-api';
import { chromeStorage } from '../lib/chrome-storage';

export default defineBackground(() => {
  const api = extensionApi();
  const repository = new Repository(chromeStorage(api));
  api.runtime.onMessage.addListener((message, sender, reply) => {
    if (sender.id !== api.runtime.id || message?.channel !== 'backtrack')
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
