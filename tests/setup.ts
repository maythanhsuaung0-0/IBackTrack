import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

vi.mock('wxt/browser', () => ({
  browser: { runtime: { sendMessage: vi.fn() } },
}));
Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => ({
    x: 100,
    y: 180,
    top: 180,
    left: 100,
    right: 400,
    bottom: 210,
    width: 300,
    height: 30,
  }),
});
Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: () => ({ matches: false }),
});
window.scrollBy = vi.fn();
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  window.getSelection()?.removeAllRanges();
  vi.useRealTimers();
});
