# Galactic Multiplier

Space-themed multiplication/division trainer (EN/DE, voice or keypad). Static site, no build step needed to deploy — GitHub Pages serves this folder as-is.

## Assets are precompiled and self-hosted — do not re-add CDNs

`style.css`, `fonts.css` + `fonts/`, and `vendor/fontawesome/` are checked in so the game works offline and on iOS. The previous version loaded the Tailwind Play CDN compiler and the Font Awesome JS at runtime, which was slow, flashed unstyled content, and broke in the PWA cache.

If you add or change Tailwind classes in `index.html`, regenerate `style.css`:

```sh
# input.css contains @tailwind directives plus the component classes
# (.mode-btn, .op-btn, .num-toggle, .badge-*) that used to live in
# <style type="text/tailwindcss"> and the badge rules that used @apply.
npx tailwindcss@3.4 -c tailwind.config.js -i input.css -o style.css --minify
```

with the content glob pointing at this folder's `index.html`.

## Microphone architecture

All speech-recognition start/stop goes through one state machine in `index.html` (`micRequestStart` / `micRequestStop` / `renderMic`, states: off, starting, listening, stopping, blocked, unsupported). Do not call `recognition.start()`/`stop()` from anywhere else, and do not reintroduce boolean flags for mic state — the previous scattered approach desynced the UI from the real recognizer (dead taps, mics closing themselves, restart storms). Rules the controller enforces: bounded restarts per question (2) then it settles with a "tap the mic" hint; a manual tap-to-close mutes auto-listen for that question; after a permission denial auto-open stops until a manual tap retries; the mic pauses while TTS speaks so the game can't hear itself; interim results only display ("Heard: …"), final results submit.

## Platform notes

- Voice support varies by Safari/iOS version, permissions, and speech services. Feature detection selects the fallback; keypad is the default and remains available.
- Speech synthesis on iOS only fires `onend` reliably if the handler is attached *before* `speak()` is called; `speak()` also has a timed fallback so a question can never stall waiting for the mic.
- Layout uses `100dvh` + `env(safe-area-inset-*)`; don't go back to plain `h-screen` (iOS Safari's toolbar makes 100vh taller than the visible screen).
- The service worker is network-first for the page so installed users actually receive fixes; bump `CACHE_NAME` in `service-worker.js` when changing cached assets.


See [October 19 changes and validation](UPDATE.md) for the integrated review fixes.
