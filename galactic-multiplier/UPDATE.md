# October 19 update

## Follow-up from mobile photos

- Question digits and streak stars no longer rely on an opacity animation to become visible. Reduced-motion settings, disabled animations, and paused animations retain visible text.
- The title uses solid, high-contrast lettering and a restrained glow. It no longer relies on transparent text with gradient clipping, which could leave only a blurred shadow.
- Keypad-mode actions use compact rows, with one input-mode switch. The question and answer remain in the visible viewport after tapping OK, including small portrait screens and landscape.
- Cache v14 refreshes installed copies. Browser regression checks verify actual opacity, letter-fill contrast, and viewport visibility, alongside screenshots in Chromium and WebKit.

These changes incorporate the remaining review fixes into the current app. They retain the existing theme, self-hosted fonts/icons, microphone state machine, interim transcripts, and bounded auto-listen behavior.

- Keypad participates in page layout. Dynamic viewport height, safe areas, scrollable screens, compact question sizing, and landscape columns keep controls reachable. Language/install controls no longer overlap the title.
- Session and question identities guard callbacks. Restarting cancels delayed feedback, speech, and microphone activity; recognizer callbacks from a previous game cannot score in a new game.
- Pause/Resume freezes active mission time. Backgrounding pauses automatically. Monotonic deadlines reject late answers.
- Finish Drill lets practice players view results and collect badges. Existing badges keep the same storage key and thresholds.
- Saved badges/settings are validated; blocked/full storage cannot crash results. Configuration, input preference, sound, and language persist.
- Spoken answers must contain one complete number. Negative signs, decimal digits, unrelated text, and ambiguous phrases cannot silently become a different answer. English/German compounds and complete answer prefixes work.
- Questions cannot immediately repeat. Practice alone reinforces queued mistakes. Answer controls and editing lock during feedback.
- German mission types, ranks, badges, and feedback are completed. The Supernova icon remains visible after earning. Selection buttons expose pressed states; minimum tap targets and reduced motion are maintained.
- Cache v13 installs a complete local shell, refreshes game assets, supports directory/query URLs offline, and deletes only old Galactic Multiplier caches. Cache failures cannot discard valid online responses.
- The manifest permits rotation and retains the newer Apple, regular, and maskable icons.

fixes.css layers adjustments over the existing compiled theme. numbers.js supplies strict answer parsing. No runtime CDN or build requirement is added.

## Validation

From the repository root with Node 24:

    node --test galactic-multiplier/tests/*.test.cjs

There are 21 deterministic checks. Subprocess-restricted environments can use --test-isolation=none. The DOM harness verifies behavior, not layout or hardware.

Browser checks:

    pip install playwright==1.58.0
    python -m playwright install --with-deps chromium webkit
    BROWSER=chromium python galactic-multiplier/tests/browser_test.py
    BROWSER=webkit python galactic-multiplier/tests/browser_test.py

The GitHub workflow runs both engines and retains screenshots at seven viewport sizes. Speech services are mocked. Actual iPhone permissions/services, safe areas, and Home Screen mode still benefit from device verification.
