# Galactic Multiplier

Static, offline-capable PWA (no runtime dependencies on any CDN).

- `index.html`, `app.js`, `speech-numbers.js` – the app. `speech-numbers.js` turns spoken answers
  ("forty eight", "achtundvierzig", "48") into numbers.
- `styles.css` – **generated** Tailwind output. Don't edit by hand.
- `src/` – Tailwind config + custom CSS the stylesheet is built from.
- `vendor/` – self-hosted Font Awesome Free 6.4.0 and Google Fonts (Fredoka, Press Start 2P; latin subset).
- `service-worker.js` – caches everything for offline use. **Bump `CACHE_NAME` when you ship changes.**

## Rebuilding the CSS

After changing classes in `index.html`/`app.js` or editing `src/input.css`:

```sh
npx tailwindcss@3.4.17 -c src/tailwind.config.js -i src/input.css -o styles.css --minify \
  --content './index.html,./app.js'
```
(run from this directory)
