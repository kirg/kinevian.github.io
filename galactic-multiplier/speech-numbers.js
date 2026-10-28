/* Turns a speech-recognition transcript into an integer.
 * Handles digits ("48", "it's 48"), English words ("forty eight", "a hundred and
 * forty four", homophones like "for"/"ate") and German words, including the
 * compound forms ("achtundvierzig", "einhundertvierundvierzig").
 * Returns null when no number can be found. */
(function (root) {
    'use strict';

    const EN = {
        zero: 0, one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, fore: 4,
        five: 5, six: 6, seven: 7, eight: 8, ate: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
        thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
        nineteen: 19, twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60,
        seventy: 70, eighty: 80, ninety: 90
    };

    const DE = {
        null: 0, ein: 1, eins: 1, eine: 1, zwei: 2, zwo: 2, drei: 3, vier: 4, fünf: 5, sechs: 6,
        sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14,
        fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, zwanzig: 20,
        dreißig: 30, dreissig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70,
        achtzig: 80, neunzig: 90
    };
    // Longest first so "dreizehn" wins over "drei" and "eins" over "ein".
    const DE_LEX = Object.keys(DE).concat(['hundert', 'und']).sort((a, b) => b.length - a.length);

    function parseEnglish(text) {
        const tokens = text.replace(/-/g, ' ').split(/[^a-z]+/).filter(Boolean);
        let current = 0, found = false;
        for (const w of tokens) {
            if (Object.prototype.hasOwnProperty.call(EN, w)) { current += EN[w]; found = true; }
            else if (w === 'hundred') { current = (current || 1) * 100; found = true; }
        }
        return found ? current : null;
    }

    // Splits one (possibly compound) German word into known parts, or null if any part is unknown.
    function lexGerman(word) {
        const out = [];
        let pos = 0;
        while (pos < word.length) {
            const hit = DE_LEX.find(w => word.startsWith(w, pos));
            if (!hit) return null;
            out.push(hit);
            pos += hit.length;
        }
        return out;
    }

    function parseGerman(text) {
        const tokens = [];
        for (const word of text.split(/[^a-zäöüß]+/).filter(Boolean)) {
            const parts = lexGerman(word.replace(/fuenf/g, 'fünf').replace(/zwoelf/g, 'zwölf'));
            if (parts) tokens.push(...parts); // unknown filler words are ignored
        }
        let total = 0, pending = null, sawAnd = false, found = false;
        for (const tok of tokens) {
            if (tok === 'und') { sawAnd = true; continue; }
            found = true;
            if (tok === 'hundert') {
                total += (pending === null ? 1 : pending) * 100;
                pending = null;
            } else {
                const val = DE[tok];
                if (sawAnd && pending !== null && val >= 20) {
                    total += val + pending; // "vier-und-zwanzig": units come first
                    pending = null;
                } else {
                    if (pending !== null) total += pending;
                    pending = null;
                    if (val < 10) pending = val; else total += val;
                }
            }
            sawAnd = false;
        }
        if (pending !== null) total += pending;
        return found ? total : null;
    }

    function parseSpokenNumber(text, lang) {
        const t = String(text).toLowerCase();
        const digits = t.match(/\d+/);
        if (digits) return parseInt(digits[0], 10);
        return String(lang).startsWith('de') ? parseGerman(t) : parseEnglish(t);
    }

    const api = { parseSpokenNumber };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.SpokenNumbers = api;
})(typeof window !== 'undefined' ? window : globalThis);
