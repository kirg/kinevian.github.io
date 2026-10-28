# October 22 iPhone fixes

- iOS starts voice input directly from the microphone or input-mode tap. It no longer attempts automatic recognition restarts after speech or silence; tap the microphone for each answer.
- A thrown or stalled microphone start returns to the keypad instead of showing a false listening state. A new tap recovers even if Safari never delivers the previous stop callback. Permission callbacks from disposed recognizers are ignored.
- The first spoken question runs inside the Start tap. Utterances stay retained until completion, stalled speech is cancelled before listening, and Resume reactivates interrupted audio.
- Keypad mode uses compact feedback and two columns of mission controls. The duplicate voice switch below the keypad is removed from layout, and the sound setting has a larger touch target.
- Cache v14 refreshes the installed shell. Later worker updates reload an idle app or wait until the active mission returns to base.

Validation: all 31 deterministic game and service-worker checks pass with `node --test --test-isolation=none galactic-multiplier/tests/*.test.cjs`. Ten new checks cover iPhone input, microphone failures, interrupted audio, speech cleanup, and app updates. Browser execution was blocked by the workspace's socket permissions; actual Safari speech services, safe areas, and Home Screen behavior still require an iPhone check.

# October 19 update

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

