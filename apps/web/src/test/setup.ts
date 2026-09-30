// Runs before every web test file.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

// jsdom has no layout engine, so it lacks scrollIntoView. SourcePane calls it on every selection.
Element.prototype.scrollIntoView = () => {};

// jsdom has no matchMedia. MUI's useMediaQuery needs one, so answer min-/max-width queries from window.innerWidth
// (set to a desktop width here; a test can change it before rendering to see the phone layout).
window.innerWidth = 1280;
window.matchMedia = (query: string) => {
  const min = /min-width:\s*([\d.]+)px/.exec(query);
  const max = /max-width:\s*([\d.]+)px/.exec(query);
  const w = window.innerWidth;
  return {
    matches: (!min || w >= +min[1]) && (!max || w <= +max[1]), media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
  } as MediaQueryList;
};
