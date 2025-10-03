import { mount } from './lib/router.js';
import { HiitRunner } from './components/HiitRunner.js';
import { StrengthRunner } from './components/StrengthRunner.js';
import { Settings } from './components/Settings.js';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

const Home = () => `
  <section class="card">
    <h2>Today</h2>
    <p>Quick start either a <strong>HIIT</strong> session or a <strong>Strength</strong> workout.</p>
    <div class="row">
      <a class="btn primary" href="#/hiit">Start HIIT</a>
      <a class="btn" href="#/strength">Start Strength</a>
    </div>
  </section>
  <section class="card">
    <h3>Zero‑backend by design</h3>
    <p class="small">All data stays in your browser. Export/Import in Settings.</p>
  </section>
`;

const NotFound = () => `<section class="card"><h2>404</h2></section>`;

mount({
  '/': Home,
  '/hiit': HiitRunner,
  '/strength': StrengthRunner,
  '/settings': Settings,
  '/404': NotFound
});
