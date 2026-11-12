import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { App } from '../../components/App';
import { installHighlightStyles } from '../../features/highlights';
import { STORE_PREFIX } from '../../lib/storage';
import './style.css';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const cleanupStyles = installHighlightStyles();
    const ui = await createShadowRootUi(ctx, {
      name: 'backtrack-reader',
      position: 'inline',
      anchor: 'body',
      onMount(container) {
        container.dataset.backtrack = 'ui';
        const app = document.createElement('div');
        container.append(app);
        const root = createRoot(app);
        root.render(
          <App
            subscribe={(listener) => {
              const onChange = (
                changes: Record<string, unknown>,
                area: string,
              ) => {
                if (
                  area === 'local' &&
                  Object.keys(changes).some((key) =>
                    key.startsWith(STORE_PREFIX),
                  )
                )
                  listener();
              };
              browser.storage.onChanged.addListener(onChange);
              return () => browser.storage.onChanged.removeListener(onChange);
            }}
          />,
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
    ctx.onInvalidated(() => {
      ui.remove();
      cleanupStyles();
    });
  },
});
