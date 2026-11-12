import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Backtrack',
    description:
      'Follow your curiosity. Save your place in long ChatGPT answers and return to it later.',
    permissions: ['storage'],
    host_permissions: ['https://chatgpt.com/*'],
    minimum_chrome_version: '105',
  },
});
