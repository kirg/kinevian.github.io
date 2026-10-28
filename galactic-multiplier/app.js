'use strict';

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------
const i18n = {
    'en-US': {
        title: "GALACTIC\nMULTIPLIER",
        missionControl: "Mission Control",
        viewHall: "View Hall of Fame",
        flightDrill: "Flight Drill",
        liveMission: "Live Mission",
        multiply: "Multiply",
        divide: "Divide",
        selectTargets: "Select Target Numbers:",
        selectMission: "Select Mission Type:",
        blitz: "1 Min Blitz",
        twentyQs: "20 Qs",
        startDrill: "Start Drill",
        launchMission: "Launch Mission",
        enableMic: "Enable microphone for voice mode",
        iosInstall: "Tip: tap Share, then “Add to Home Screen” to install.",
        score: "Score",
        streak: "Streak",
        whatIs: "What is...",
        tapSpeak: "Tap to speak answer",
        listening: "Listening...",
        voiceUnsupported: "Voice not supported here",
        keypad: "Use Keypad Instead",
        closeKeypad: "Close Keypad",
        abort: "Abort Mission",
        questionMul: (a, b) => `What is ${a} times ${b}?`,
        questionDiv: (a, b) => `What is ${a} divided by ${b}?`,
        correct: (ans) => `The answer is ${ans}`,
        praise: ["Awesome!", "Stellar!", "Cosmic!", "Perfect!", "Nice work!"],
        miss: "Miss!",
        finalScore: "Final Score",
        accuracy: "Accuracy",
        returnBase: "Return to Base",
        hallTitle: "Hall of Fame",
        achievements: "Your Achievements",
        missionComplete: "Mission Complete!",
        rank: "Rank:",
        newBadge: "New Badge Earned!",
        newBadgeSpoken: (rank) => `Mission Complete! New Badge Earned: ${rank}!`,
        completeSpoken: (rank) => `Mission Complete! You achieved the rank of ${rank}`,
        ranks: {
            cadet: "Space Cadet", pilot: "Rocket Pilot", commander: "Mission Commander",
            legend: "Galactic Legend", navigator: "Nebula Navigator",
            supernova: "Supernova Specialist", master: "Universal Master"
        },
        badgePilot: "Rocket\nPilot", badgeCommander: "Mission\nCmdr", badgeLegend: "Galactic\nLegend",
        badgeNavigator: "Nebula\nNav", badgeSupernova: "Supernova\nSpec", badgeMaster: "Universal\nMaster"
    },
    'de-DE': {
        title: "GALAKTISCHER\nMULTIPLIKATOR",
        missionControl: "Missionskontrolle",
        viewHall: "Ruhmeshalle ansehen",
        flightDrill: "Flugübung",
        liveMission: "Echte Mission",
        multiply: "Multiplizieren",
        divide: "Dividieren",
        selectTargets: "Zielzahlen wählen:",
        selectMission: "Missionstyp wählen:",
        blitz: "1-Min-Blitz",
        twentyQs: "20 Fragen",
        startDrill: "Übung starten",
        launchMission: "Mission starten",
        enableMic: "Mikrofon aktivieren für Sprachmodus",
        iosInstall: "Tipp: Auf „Teilen“ tippen, dann „Zum Home-Bildschirm“.",
        score: "Punkte",
        streak: "Serie",
        whatIs: "Wieviel ist...",
        tapSpeak: "Tippen zum Sprechen",
        listening: "Zuhören...",
        voiceUnsupported: "Sprache hier nicht verfügbar",
        keypad: "Tastatur benutzen",
        closeKeypad: "Tastatur schließen",
        abort: "Mission abbrechen",
        questionMul: (a, b) => `Wieviel ist ${a} mal ${b}?`,
        questionDiv: (a, b) => `Wieviel ist ${a} geteilt durch ${b}?`,
        correct: (ans) => `Die Antwort ist ${ans}`,
        praise: ["Super!", "Klasse!", "Kosmisch!", "Perfekt!", "Gut gemacht!"],
        miss: "Daneben!",
        finalScore: "Endpunktzahl",
        accuracy: "Genauigkeit",
        returnBase: "Zur Basis",
        hallTitle: "Ruhmeshalle",
        achievements: "Deine Erfolge",
        missionComplete: "Mission erfüllt!",
        rank: "Rang:",
        newBadge: "Neues Abzeichen erreicht!",
        newBadgeSpoken: (rank) => `Mission erfüllt! Neuer Rang: ${rank}!`,
        completeSpoken: (rank) => `Mission erfüllt! Du hast den Rang ${rank} erreicht`,
        ranks: {
            cadet: "Weltraum-Kadett", pilot: "Raketenpilot", commander: "Missionskommandant",
            legend: "Galaktische Legende", navigator: "Nebel-Navigator",
            supernova: "Supernova-Spezialist", master: "Universeller Meister"
        },
        badgePilot: "Raketen-\npilot", badgeCommander: "Missions-\nkommandant", badgeLegend: "Galaktische\nLegende",
        badgeNavigator: "Nebel-\nNavigator", badgeSupernova: "Supernova-\nSpezialist", badgeMaster: "Universeller\nMeister"
    }
};

// Highest rank whose threshold the score reaches wins. Each rank above "cadet" has a badge.
const RANKS = [
    { key: 'cadet',     min: 0,    color: 'text-gray-400' },
    { key: 'pilot',     min: 200,  color: 'text-blue-400' },
    { key: 'commander', min: 500,  color: 'text-purple-400' },
    { key: 'legend',    min: 1000, color: 'text-yellow-400' },
    { key: 'navigator', min: 1500, color: 'text-cyan-400' },
    { key: 'supernova', min: 2000, color: 'text-orange-400' },
    { key: 'master',    min: 3000, color: 'text-pink-400' }
];

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Platform detection
// ---------------------------------------------------------------------------
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

// ---------------------------------------------------------------------------
// Storage (localStorage can throw in private mode / when blocked)
// ---------------------------------------------------------------------------
const store = {
    get(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const prefs = store.get('galactic_prefs', {});
const defaultLang = (navigator.language || '').toLowerCase().startsWith('de') ? 'de-DE' : 'en-US';

const state = {
    score: 0,
    streak: 0,
    currentQ: { displayN1: 0, displayN2: 0, ans: 0, speech: "", rawN1: 0, rawN2: 0 },
    keypadInput: "",
    usingKeypad: false,
    mode: 'practice',
    operation: ['multiply', 'divide'].includes(prefs.operation) ? prefs.operation : 'multiply',
    testType: 'time',
    practiceNums: Array.isArray(prefs.nums) && prefs.nums.length
        ? prefs.nums.filter(n => Number.isInteger(n) && n >= 2 && n <= 12)
        : [2, 3, 4, 5],
    isPlaying: false,
    locked: false,              // true between answering and the next question (blocks double-submits)
    gen: 0,                     // bumped on every start/stop so stale timeouts can't touch a newer game
    timer: null,
    endTime: 0,
    pausedAt: 0,
    timeRemaining: 60,
    questionsCount: 0,
    correctCount: 0,
    targetQuestions: 20,
    badges: [],
    lastQuestionKey: null,
    mistakesQueue: [],
    lastRank: 'cadet',
    language: prefs.lang && i18n[prefs.lang] ? prefs.lang : defaultLang,
    // voice
    isListening: false,
    voiceSupported: false,
    micManual: false,           // current recognition was started by a tap (vs. automatically)
    micStopped: false,          // user tapped the mic to stop it
    autoListenBlocked: false,   // browser refuses non-gesture starts (iOS) -> user taps the mic
    micRetries: 0,
    maxMicRetries: 3
};
if (!state.practiceNums.length) state.practiceNums = [2, 3, 4, 5];

function savePrefs() {
    store.set('galactic_prefs', { lang: state.language, nums: state.practiceNums, operation: state.operation });
}

// Run fn after ms, but only if the same game is still in progress.
function later(fn, ms) {
    const gen = state.gen;
    setTimeout(() => { if (gen === state.gen && state.isPlaying) fn(); }, ms);
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
const SCREENS = ['startScreen', 'hallScreen', 'gameScreen', 'overScreen'];
function showScreen(id) {
    for (const s of SCREENS) $(s).classList.toggle('active', s === id);
    const el = $(id);
    if (el) el.scrollTop = 0;
}
function openHall() { showScreen('hallScreen'); }
function closeHall() { showScreen('startScreen'); }

// ---------------------------------------------------------------------------
// Language
// ---------------------------------------------------------------------------
function toggleLanguage() {
    state.language = state.language === 'en-US' ? 'de-DE' : 'en-US';
    if (recognition) recognition.lang = state.language;
    savePrefs();
    updateTexts();
}

function updateTexts() {
    const t = i18n[state.language];
    document.documentElement.lang = state.language.slice(0, 2);
    $('langBtn').textContent = state.language === 'en-US' ? '🇺🇸' : '🇩🇪';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const v = t[el.dataset.i18n];
        if (typeof v === 'string') el.textContent = v;
    });
    $('startBtnText').textContent = state.mode === 'practice' ? t.startDrill : t.launchMission;
    $('toggleKeypadBtn').textContent = t.keypad;
    renderRank();
    updateMicUI(state.isListening);
}

function renderRank() {
    const t = i18n[state.language];
    $('rankTitle').textContent = `${t.rank} ${t.ranks[state.lastRank]}`;
}

// ---------------------------------------------------------------------------
// PWA: service worker + install prompt
// ---------------------------------------------------------------------------
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch(err => console.log('Service Worker failed', err));
    });
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('installBtn').classList.remove('hidden');
});
window.addEventListener('appinstalled', () => $('installBtn').classList.add('hidden'));

async function installApp() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch (e) { /* ignore */ }
    deferredPrompt = null;
    $('installBtn').classList.add('hidden');
}

// iOS Safari has no install prompt; show a hint instead (not when already installed).
if (isIOS && !isStandalone) $('iosInstallHint').classList.remove('hidden');

// ---------------------------------------------------------------------------
// Wake lock (keep the screen on while playing)
// ---------------------------------------------------------------------------
let wakeLock = null;
async function requestWakeLock() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (err) { wakeLock = null; }
}
function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

// Pause the clock when the app is backgrounded (call, app switch, screen lock).
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        if (state.isPlaying) {
            state.pausedAt = Date.now();
            stopListening();
            if (synth) synth.cancel();
        }
    } else if (state.isPlaying) {
        if (state.pausedAt) {
            state.endTime += Date.now() - state.pausedAt;
            state.pausedAt = 0;
        }
        requestWakeLock();
    }
});

// ---------------------------------------------------------------------------
// Persistence: badges
// ---------------------------------------------------------------------------
function loadBadges() {
    const saved = store.get('galactic_badges', []);
    state.badges = Array.isArray(saved) ? saved : [];
    renderBadges();
}

function saveBadge(badgeId) {
    if (state.badges.includes(badgeId)) return false;
    state.badges.push(badgeId);
    store.set('galactic_badges', state.badges);
    renderBadges();
    return true;
}

function renderBadges() {
    for (const id of state.badges) {
        const el = $('badge-' + id);
        if (el) el.classList.add('earned');
    }
}

// ---------------------------------------------------------------------------
// Audio: speech synthesis + sound effects
// ---------------------------------------------------------------------------
const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
function loadVoices() { if (synth) voices = synth.getVoices(); }
if (synth) {
    loadVoices();
    if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
}

function pickVoice() {
    const norm = (v) => (v.lang || '').replace('_', '-').toLowerCase();
    if (state.language === 'de-DE') {
        return voices.find(v => norm(v) === 'de-de') || voices.find(v => norm(v).startsWith('de'));
    }
    return voices.find(v => v.name.includes('Google US English')) ||
        voices.find(v => norm(v) === 'en-us') || voices.find(v => norm(v).startsWith('en'));
}

let currentUtterance = null; // keep a reference: Chrome can GC an utterance mid-speech and never fire onend
function speak(text, onDone) {
    let finished = false;
    const done = () => { if (finished) return; finished = true; if (onDone) onDone(); };
    if (!synth) { done(); return; }

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;
    utter.pitch = 1.1;
    utter.lang = state.language;
    const voice = pickVoice();
    if (voice) utter.voice = voice;
    utter.onend = done;
    utter.onerror = done;
    currentUtterance = utter;

    // iOS sometimes drops an utterance queued immediately after cancel(), so give it a beat.
    if (synth.speaking || synth.pending) {
        synth.cancel();
        setTimeout(() => synth.speak(utter), 60);
    } else {
        synth.speak(utter);
    }
    // Some engines (notably iOS) never fire onend; don't leave the game waiting forever.
    setTimeout(done, 1500 + text.length * 120);
}

// One shared AudioContext: iOS only allows a handful per page, and a new one per sound
// stops producing audio after a few answers. It must be created/resumed from a user gesture.
let audioCtx = null;
function unlockAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
        if (!audioCtx) audioCtx = new AC();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* ignore */ }
    // Prime speech synthesis inside the gesture so later (timer-driven) speak() calls are allowed on iOS.
    if (synth) {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        synth.speak(u);
    }
}

function playSound(success) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    if (success) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

// ---------------------------------------------------------------------------
// Speech recognition
// ---------------------------------------------------------------------------
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

// Installed iOS web apps expose webkitSpeechRecognition but it always fails there.
if (SpeechRecognitionCtor && !(isIOS && isStandalone)) {
    try {
        recognition = new SpeechRecognitionCtor();
        recognition.continuous = false;
        recognition.lang = state.language;
        recognition.interimResults = false;
        recognition.maxAlternatives = 3;
        state.voiceSupported = true;
    } catch (e) { recognition = null; }
}
// iOS only allows recognition to start from a tap, so don't try to start it automatically.
state.autoListenBlocked = isIOS;

if (recognition) {
    recognition.onstart = () => {
        state.isListening = true;
        updateMicUI(true);
    };

    recognition.onend = () => {
        state.isListening = false;
        // Retry silently if nothing was heard (not after a result, a tap-to-stop, or when blocked).
        const canRetry = state.isPlaying && !state.locked && !state.usingKeypad && !state.micStopped &&
            !state.autoListenBlocked && state.micRetries < state.maxMicRetries;
        if (canRetry) {
            state.micRetries++;
            setTimeout(() => startListening(false, true), 150);
            return;
        }
        updateMicUI(false);
    };

    recognition.onresult = (event) => {
        if (!state.isPlaying || state.locked) return;
        const alts = [];
        const res = event.results[event.results.length - 1];
        for (let i = 0; i < res.length; i++) alts.push(res[i].transcript);
        processVoiceInput(alts);
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        state.isListening = false;
        updateMicUI(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            if (state.micManual) {
                // The user tapped the mic and it still failed: permission is really denied.
                showBubble(i18n[state.language].keypad, 2500);
                setKeypad(true);
            } else {
                // Automatic start refused (needs a tap). Fall back to tap-to-speak.
                state.autoListenBlocked = true;
            }
        }
    };
} else {
    $('micBtn').classList.add('hidden');
    state.usingKeypad = true; // keypad only; opened when a game starts
}

function startListening(manual, isRetry) {
    if (!recognition || !state.isPlaying || state.usingKeypad || state.isListening || state.locked) return;
    if (state.pausedAt || document.visibilityState === 'hidden') return;
    if (!manual && !isRetry && state.autoListenBlocked) return;
    state.micManual = !!manual;
    state.micStopped = false;
    if (manual) { if (!isIOS) state.autoListenBlocked = false; state.micRetries = 0; }
    try { recognition.start(); } catch (e) { /* already started */ }
}

function stopListening() {
    if (recognition && state.isListening) {
        state.micStopped = true;
        try { recognition.abort(); } catch (e) { /* ignore */ }
    }
    state.isListening = false;
    updateMicUI(false);
}

function processVoiceInput(alternatives) {
    if (!state.isPlaying || state.usingKeypad || state.locked) return;
    const nums = alternatives
        .map(a => SpokenNumbers.parseSpokenNumber(a, state.language))
        .filter(n => n !== null && Number.isFinite(n));

    if (!nums.length) {
        $('userAnswerDisplay').textContent = "?";
        showBubble("?", 1000);
        // Heard something that wasn't a number: keep listening.
        later(() => startListening(false), 300);
        return;
    }
    // Recognisers often mishear; if any of the alternatives is the right answer, accept it.
    const number = nums.includes(state.currentQ.ans) ? state.currentQ.ans : nums[0];
    $('userAnswerDisplay').textContent = number;
    checkAnswer(false, number);
}

// ---------------------------------------------------------------------------
// Configuration UI
// ---------------------------------------------------------------------------
const grid = $('numGrid');
for (let i = 2; i <= 12; i++) {
    const btn = document.createElement('button');
    btn.className = 'num-toggle' + (state.practiceNums.includes(i) ? ' selected' : '');
    btn.textContent = i;
    btn.setAttribute('aria-pressed', state.practiceNums.includes(i));
    btn.onclick = () => togglePracticeNum(i, btn);
    grid.appendChild(btn);
}

function togglePracticeNum(num, btn) {
    if (state.practiceNums.includes(num)) {
        if (state.practiceNums.length > 1) {
            state.practiceNums = state.practiceNums.filter(n => n !== num);
            btn.classList.remove('selected');
        }
    } else {
        state.practiceNums.push(num);
        btn.classList.add('selected');
    }
    btn.setAttribute('aria-pressed', state.practiceNums.includes(num));
    savePrefs();
}

function setMode(m) {
    state.mode = m;
    $('btnModePractice').classList.toggle('active', m === 'practice');
    $('btnModeTest').classList.toggle('active', m === 'test');
    $('configTest').classList.toggle('hidden', m !== 'test');
    const t = i18n[state.language];
    $('startBtnText').textContent = m === 'practice' ? t.startDrill : t.launchMission;
}

function setOperation(op) {
    state.operation = op;
    $('btnOpMultiply').classList.toggle('active', op === 'multiply');
    $('btnOpDivide').classList.toggle('active', op === 'divide');
    savePrefs();
}

function setTestType(t) {
    state.testType = t;
    $('btnTestTime').classList.toggle('active', t === 'time');
    $('btnTestCount').classList.toggle('active', t === 'count');
}

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------
function startGame() {
    state.gen++;
    clearInterval(state.timer);
    state.score = 0;
    state.streak = 0;
    state.questionsCount = 0;
    state.correctCount = 0;
    state.mistakesQueue = [];
    state.lastQuestionKey = null;
    state.isPlaying = true;
    state.locked = false;
    state.pausedAt = 0;
    state.micStopped = false;

    unlockAudio();   // must happen inside this tap
    requestWakeLock();

    const statusEl = $('missionStatus');
    $('operatorSign').textContent = state.operation === 'multiply' ? '×' : '÷';
    $('statusValue').classList.remove('text-red-400');
    $('mascot').textContent = '🛸';
    $('mascot').classList.remove('bounce');
    $('userAnswerDisplay').classList.remove('text-green-400', 'text-red-400');

    if (state.mode === 'test') {
        statusEl.classList.remove('hidden');
        if (state.testType === 'time') {
            state.timeRemaining = 60;
            state.endTime = Date.now() + 60000;
            $('statusIcon').innerHTML = '<i class="fa-solid fa-hourglass-half"></i>';
            $('statusValue').textContent = "60s";
            startTimer();
        } else {
            state.targetQuestions = 20;
            $('statusIcon').innerHTML = '<i class="fa-solid fa-list-ol"></i>';
            $('statusValue').textContent = `1/${state.targetQuestions}`;
        }
    } else {
        statusEl.classList.add('hidden');
    }

    showScreen('gameScreen');
    setKeypad(state.usingKeypad);
    updateScore();
    nextQuestion();
}

function startTimer() {
    clearInterval(state.timer);
    const gen = state.gen;
    state.timer = setInterval(() => {
        if (gen !== state.gen || !state.isPlaying) { clearInterval(state.timer); return; }
        if (state.pausedAt) return; // app is in the background
        // Derive from the wall clock: setInterval drifts and iOS throttles it.
        const remaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
        if (remaining !== state.timeRemaining) {
            state.timeRemaining = remaining;
            $('statusValue').textContent = remaining + "s";
            $('statusValue').classList.toggle('text-red-400', remaining <= 10);
        }
        if (remaining <= 0) endGame();
    }, 250);
}

function nextQuestion() {
    if (!state.isPlaying) return;
    state.locked = false;
    state.micRetries = 0;
    state.micStopped = false;

    if (state.mode === 'test' && state.testType === 'count') {
        if (state.questionsCount >= state.targetQuestions) { endGame(); return; }
        $('statusValue').textContent = `${state.questionsCount + 1}/${state.targetQuestions}`;
    }

    let baseNum, factor;
    let isMistakeRetry = false;

    if (state.mistakesQueue.length > 0 && Math.random() < 0.5) {
        const m = state.mistakesQueue[0];
        if (`${m.n1}-${m.n2}-${state.operation}` !== state.lastQuestionKey) {
            state.mistakesQueue.shift();
            baseNum = m.n1;
            factor = m.n2;
            isMistakeRetry = true;
        }
    }

    if (!isMistakeRetry) {
        let attempts = 0;
        do {
            baseNum = state.practiceNums[Math.floor(Math.random() * state.practiceNums.length)];
            factor = Math.floor(Math.random() * 11) + 2; // 2..12, same range as the selectable targets
            if (`${baseNum}-${factor}-${state.operation}` !== state.lastQuestionKey) break;
            attempts++;
        } while (attempts < 5);
    }
    state.lastQuestionKey = `${baseNum}-${factor}-${state.operation}`;

    const t = i18n[state.language];
    let displayN1, displayN2, ans, speechQ;
    if (state.operation === 'multiply') {
        displayN1 = baseNum; displayN2 = factor; ans = baseNum * factor;
        speechQ = t.questionMul(displayN1, displayN2);
    } else {
        displayN1 = baseNum * factor; displayN2 = baseNum; ans = factor;
        speechQ = t.questionDiv(displayN1, displayN2);
    }
    state.currentQ = { displayN1, displayN2, ans, speech: speechQ, rawN1: baseNum, rawN2: factor };
    state.keypadInput = "";
    const answerEl = $('userAnswerDisplay');
    answerEl.textContent = "";
    answerEl.classList.remove('text-green-400', 'text-red-400');

    const num1El = $('num1'), num2El = $('num2');
    $('questionBox').classList.remove('shake');
    num1El.textContent = displayN1;
    num2El.textContent = displayN2;
    num1El.classList.remove('pop-in');
    num2El.classList.remove('pop-in');
    void num1El.offsetWidth; // restart the animation
    num1El.classList.add('pop-in');
    later(() => num2El.classList.add('pop-in'), 100);

    if (state.mode === 'test' && state.testType === 'time') {
        // Blitz: question is on screen only; start listening straight away.
        later(() => startListening(false), 400);
    } else {
        // Drill / 20 Qs: read the question aloud, then listen.
        later(() => speak(speechQ, () => later(() => startListening(false), 0)), 400);
    }
}

function checkAnswer(isKeypad, val = null) {
    if (!state.isPlaying || state.locked) return;
    let userAns;
    if (isKeypad) {
        if (state.keypadInput === "") return; // OK with nothing typed is not an answer
        userAns = parseInt(state.keypadInput, 10);
    } else {
        userAns = val;
    }
    state.locked = true;
    stopListening();
    if (userAns === state.currentQ.ans) handleCorrect();
    else handleIncorrect(userAns);
}

function handleCorrect() {
    state.score += 10 + (state.streak * 2);
    state.streak++;
    state.correctCount++;
    state.questionsCount++;
    updateScore();

    if (state.mode === 'practice') showBubble(getRandomPraise(), 1000);
    playSound(true);

    const mascot = $('mascot');
    mascot.textContent = "🚀";
    mascot.classList.add('bounce');
    $('userAnswerDisplay').classList.add('text-green-400');

    const delay = (state.mode === 'test' && state.testType === 'time') ? 600 : 1500;
    later(() => {
        mascot.textContent = "🛸";
        mascot.classList.remove('bounce');
        nextQuestion();
    }, delay);
}

function handleIncorrect() {
    state.streak = 0;
    state.questionsCount++;
    updateScore();

    if (state.mistakesQueue.length < 10) {
        state.mistakesQueue.push({ n1: state.currentQ.rawN1, n2: state.currentQ.rawN2 });
    }
    playSound(false);
    $('userAnswerDisplay').classList.add('text-red-400');

    const t = i18n[state.language];
    if (state.mode === 'practice') {
        showBubble(t.correct(state.currentQ.ans), 1500);
        speak(t.correct(state.currentQ.ans));
    } else {
        showBubble(t.miss, 800);
    }

    const box = $('questionBox');
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');

    const delay = (state.mode === 'test' && state.testType === 'time') ? 800 : 2000;
    later(() => nextQuestion(), delay);
}

function stopGame() {
    state.gen++;
    state.isPlaying = false;
    state.locked = false;
    clearInterval(state.timer);
    stopListening();
    if (synth) synth.cancel();
    releaseWakeLock();
}

function endGame() {
    stopGame();

    let rank = RANKS[0];
    let earnedNewBadge = false;
    for (const r of RANKS) {
        if (r.min > 0 && state.score >= r.min) {
            if (saveBadge(r.key)) earnedNewBadge = true;
            rank = r;
        }
    }
    const accuracy = state.questionsCount > 0
        ? Math.round((state.correctCount / state.questionsCount) * 100) : 0;

    state.lastRank = rank.key;
    renderRank();
    $('rankTitle').className = "text-xl font-bold mb-2 " + rank.color;
    $('finalScore').textContent = state.score;
    $('finalAccuracy').textContent = accuracy + "%";
    $('newBadgeAlert').classList.toggle('hidden', !earnedNewBadge);
    showScreen('overScreen');

    const t = i18n[state.language];
    const rankName = t.ranks[rank.key];
    speak(earnedNewBadge ? t.newBadgeSpoken(rankName) : t.completeSpoken(rankName));
}

function resetToMenu() {
    showScreen('startScreen');
    $('scoreDisplay').textContent = "0";
    $('statusValue').classList.remove('text-red-400');
    updateScore();
}

function quitGame() {
    stopGame();
    showScreen('startScreen');
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function updateScore() {
    $('scoreDisplay').textContent = state.score;
    const container = $('streakContainer');
    container.innerHTML = '';
    for (let i = 0; i < 3; i++) {
        const star = document.createElement('i');
        const lit = i < state.streak;
        star.className = `fa-solid fa-star text-sm ${lit ? 'text-yellow-400 pop-in' : 'text-slate-700'}`;
        container.appendChild(star);
    }
}

function updateMicUI(listening) {
    const btn = $('micBtn');
    const status = $('micStatus');
    const t = i18n[state.language];
    btn.classList.toggle('pulse-mic', listening);
    btn.classList.toggle('bg-green-500', listening);
    btn.classList.toggle('border-green-400', listening);
    btn.classList.toggle('bg-red-500', !listening);
    btn.classList.toggle('border-red-400', !listening);
    status.classList.toggle('text-green-400', listening);
    status.classList.toggle('text-gray-400', !listening);
    status.classList.toggle('animate-pulse', !listening && state.autoListenBlocked);
    status.textContent = !recognition ? t.voiceUnsupported : (listening ? t.listening : t.tapSpeak);
}

let bubbleTimer = null;
function showBubble(text, duration) {
    const b = $('speechBubble');
    b.textContent = text;
    b.classList.remove('opacity-0');
    clearTimeout(bubbleTimer); // otherwise an earlier bubble's timer hides this one early
    bubbleTimer = setTimeout(() => b.classList.add('opacity-0'), duration);
}

// Show/hide the keypad. It sits in the page flow so it never covers the question.
function setKeypad(open) {
    state.usingKeypad = open || !recognition;
    const show = state.usingKeypad;
    const keypad = $('keypad');
    const wasHidden = keypad.classList.contains('hidden');
    keypad.classList.toggle('hidden', !show);
    if (show && wasHidden) {
        keypad.classList.remove('slide-up');
        void keypad.offsetWidth;
        keypad.classList.add('slide-up');
    }
    // Voice controls are pointless while the keypad is the input method (unless the keypad is optional).
    $('voiceControls').classList.toggle('hidden', show);
    if (show) stopListening();
}

function toggleKeypad() {
    const opening = !state.usingKeypad;
    // Without voice support the keypad is the only input, so it can't be closed.
    if (!opening && !recognition) return;
    setKeypad(opening);
    if (!opening && state.isPlaying && !state.locked) startListening(true);
    updateTexts();
}

function addKey(num) {
    if (state.locked || state.keypadInput.length >= 3) return;
    state.keypadInput += num;
    $('userAnswerDisplay').textContent = state.keypadInput;
}

function backspaceKey() {
    if (state.locked) return;
    state.keypadInput = state.keypadInput.slice(0, -1);
    $('userAnswerDisplay').textContent = state.keypadInput;
}

function getRandomPraise() {
    const phrases = i18n[state.language].praise;
    return phrases[Math.floor(Math.random() * phrases.length)];
}

// ---------------------------------------------------------------------------
// Wire up + init
// ---------------------------------------------------------------------------
$('micBtn').addEventListener('click', () => {
    if (state.isListening) { stopListening(); }
    else startListening(true);
});
$('toggleKeypadBtn').addEventListener('click', toggleKeypad);
// Hide the close button on the keypad when voice is unavailable (nothing to go back to).
if (!recognition) $('btnCloseKeypad').classList.add('hidden');

loadBadges();
setOperation(state.operation);
updateTexts();
