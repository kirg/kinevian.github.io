/* Parse a complete answer, never concatenate unrelated digits or drop a minus sign. */
(function (root) {
    const english = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const enTens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const german = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
    const deTens = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
    function normalize(text) { return text.toLowerCase().normalize('NFC').replace(/ß/g, 'ss').replace(/[\s-]+/g, ''); }
    const maps = { 'en-US': new Map(), 'de-DE': new Map() };
    // The largest fact is 12 × 12 = 144. Include 0–999 for incorrect answers too.
    for (let n = 0; n <= 999; n++) {
        const rest = n % 100;
        const enSmall = rest < 20 ? english[rest] : enTens[Math.floor(rest / 10)] + (rest % 10 ? ' ' + english[rest % 10] : '');
        const deSmall = rest < 20 ? german[rest] : (rest % 10 ? (rest % 10 === 1 ? 'ein' : german[rest % 10]) + 'und' : '') + deTens[Math.floor(rest / 10)];
        const en = n < 100 ? enSmall : english[Math.floor(n / 100)] + ' hundred' + (rest ? ' ' + enSmall : '');
        const de = n < 100 ? deSmall : (Math.floor(n / 100) === 1 ? 'ein' : german[Math.floor(n / 100)]) + 'hundert' + (rest ? deSmall : '');
        maps['en-US'].set(normalize(en), n);
        maps['en-US'].set(normalize(en.replace('hundred ', 'hundred and ')), n);
        maps['de-DE'].set(normalize(de), n);
        if (n >= 100 && n < 200) maps['de-DE'].set(normalize(de.replace(/^einhundert/, 'hundert')), n);
    }
    maps['de-DE'].set('ein', 1);
    function parseAnswer(text, language = 'en-US') {
        if (typeof text !== 'string') return null;
        // Speech engines often add sentence punctuation, but decimals stay intact.
        const clean = text.toLowerCase().trim().replace(/[.!?]$/, '').trim();
        if (/^\d{1,3}$/.test(clean)) return Number(clean);
        if (!/^[a-zäöüß\s-]+$/i.test(clean)) return null;
        return maps[language]?.get(normalize(clean)) ?? null;
    }
    root.parseAnswer = parseAnswer;
    if (typeof module !== 'undefined') module.exports = { parseAnswer };
})(typeof window === 'undefined' ? globalThis : window);
