const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Lightweight DOM and deterministic clock for game lifecycle tests, not layout tests.
class Element {
    constructor(tag = 'div', document) {
        this.tagName = tag;
        this.ownerDocument = document;
        this.attributes = {};
        this.dataset = {};
        this.children = [];
        this.listeners = new Map();
        this.textContent = '';
        this.hidden = false;
        this.disabled = false;
        this.className = ''; this.style = {};
        Object.defineProperty(this, 'innerText', {get: () => this.textContent, set: value => {this.textContent = String(value)}});
        this.classList = {
            add: (...names) => { this.className = [...new Set(this.className.split(' ').concat(names))].filter(Boolean).join(' '); },
            remove: (...names) => { this.className = this.className.split(' ').filter(n => !names.includes(n)).join(' '); },
            contains: name => this.className.split(' ').includes(name),
            toggle: (name, force) => {
                const add = force === undefined ? !this.classList.contains(name) : force;
                this.classList[add ? 'add' : 'remove'](name);
                return add;
            }
        };
    }
    setAttribute(key, value) {
        this.attributes[key] = String(value);
        if (key === 'id') this.id = value;
        if (key === 'class') this.className = value;
        if (key.startsWith('data-')) this.dataset[key.slice(5)] = value;
    }
    getAttribute(key) { return this.attributes[key]; }
    append(...elements) {
        for (const el of elements) {
            el.parentElement = this;
            this.children.push(el);
        }
    }
    appendChild(el) { this.append(el); }
    replaceChildren(...elements) { this.children = []; this.append(...elements); }
    addEventListener(type, fn) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(fn);
    }
    dispatchEvent(event) { for (const fn of this.listeners.get(event.type) || []) fn(event); }
    click() { if (!this.disabled) { this.onclick?.(); this.dispatchEvent({ type: 'click', target: this }); } }
    focus() { this.ownerDocument.activeElement = this; }
}
class Button extends Element {}
class Input extends Element {}
function createDocument(html) {
    const doc = new Element('document');
    doc.ownerDocument = doc;
    doc.visibilityState = 'visible';
    doc.createElement = tag => new (tag === 'button' ? Button : tag === 'input' ? Input : Element)(tag, doc);
    doc.createTextNode = text => Object.assign(new Element('#text', doc), { textContent: text });
    const stack = [doc];
    const voidTags = new Set(['meta', 'link', 'input', 'br']);
    for (const token of html.matchAll(/<\/?([a-zA-Z0-9]+)([^>]*)>|([^<]+)/g)) {
        if (token[3]) { stack.at(-1).textContent += token[3].trim(); continue; }
        const tag = token[1].toLowerCase();
        if (token[0].startsWith('</')) { if (stack.at(-1).tagName === tag) stack.pop(); continue; }
        const el = doc.createElement(tag);
        for (const attr of token[2].matchAll(/([a-zA-Z0-9-]+)="([^"]*)"/g)) el.setAttribute(attr[1], attr[2]);
        el.hidden = /\bhidden\b/.test(token[2].replace(/"[^"]*"/g, ''));
        stack.at(-1).append(el);
        if (!voidTags.has(tag)) stack.push(el);
    }
    const all = () => {
        const elements = [];
        const visit = root => { for (const el of root.children) { elements.push(el); visit(el); } };
        visit(doc);
        return elements;
    };
    doc.getElementById = id => all().find(el => el.id === id);
    doc.documentElement = all().find(el => el.tagName === 'html');
    doc.body = all().find(el => el.tagName === 'body');
    doc.querySelector = selector => doc.querySelectorAll(selector)[0];
    doc.querySelectorAll = selector => {
        if (selector.startsWith('#badge-')) { const [id, cls] = selector.split(' '); const root=doc.getElementById(id.slice(1)); return root.children.filter(el => el.classList.contains(cls.slice(1))); }
        if (selector.startsWith('button[id^=')) { const prefix=selector.split(String.fromCharCode(34))[1]; return all().filter(el => el.tagName==='button' && el.id?.startsWith(prefix)); }
        if (selector === '#keypad button' || selector === '#keypad .key-btn') {
            return all().filter(el => el.tagName === 'button' && function inside(node) { return !!node && (node.id === 'keypad' || inside(node.parentElement)); }(el.parentElement));
        }
        if (selector.startsWith('.')) return all().filter(el => el.classList.contains(selector.slice(1)));
        const attr = /^\[([a-z-]+)\]$/.exec(selector)?.[1];
        if (attr) return all().filter(el => el.attributes[attr] !== undefined);
        throw new Error('Unsupported selector: ' + selector);
    };
    return doc;
}
function setup(options = {}) {
    const base = path.join(__dirname, '..');
    const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
    const document = createDocument(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, ''));
    let time = 0;
    let timerId = 0;
    const timers = new Map();
    const storage = new Map(Object.entries(options.storage || {}));
    const requests = [];
    const speech = [];
    class Recognition {
        constructor() { requests.push(this); }
        start() { this.started = true; this.onstart?.(); }
        abort() { this.aborted = true; this.onend?.(); }
        stop() { this.onend?.(); }
        result(text) {
            const result = [{ transcript: text }];
            result.isFinal = true;
            this.onresult?.({ results: [result], resultIndex: 0 });
        }
        error(error) { this.onerror?.({ error }); this.onend?.(); }
    }
    const window = new Element('window', document);
    window.location = { protocol: 'file:' };
    window.matchMedia = () => ({ matches: false });
    window.scrollTo = () => {};
    window.speechSynthesis = options.noSynthesis ? undefined : {
        cancel: () => {}, getVoices: () => [], speak: utter => speech.push(utter.text)
    };
    window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    if (options.voice) window.SpeechRecognition = Recognition;
    const context = vm.createContext({
        window, document, navigator: { userAgent: 'iPhone' },
        HTMLButtonElement: Button, HTMLInputElement: Input,
        SpeechSynthesisUtterance: window.SpeechSynthesisUtterance, speechSynthesis: window.speechSynthesis,
        localStorage: {
            getItem: key => {
                if (options.storageDenied) throw new Error('Storage denied');
                return storage.get(key) ?? null;
            },
            setItem: (key, value) => {
                if (options.storageDenied) throw new Error('Storage denied');
                storage.set(key, value);
            }
        },
        performance: { now: () => time },
        setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: time + ms }); return id; },
        clearTimeout: id => timers.delete(id),
        setInterval: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: time + ms, interval: ms }); return id; },
        clearInterval: id => timers.delete(id), console
    });
    vm.runInContext(fs.readFileSync(path.join(base, 'numbers.js'), 'utf8'), context);
    vm.runInContext(html.split('<script>')[1].split('</script>')[0], context);
    function advance(ms) {
        const end = time + ms;
        while (true) {
            const next = [...timers].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
            if (!next) break;
            const [id, timer] = next;
            time = timer.at;
            if (timer.interval) timer.at += timer.interval;
            else timers.delete(id);
            timer.fn();
        }
        time = end;
    }
    return {
        context, document, window, requests, speech, storage, timers, advance,
        el: id => document.getElementById(id),
        run: code => vm.runInContext(code, context),
        get state() { return JSON.parse(vm.runInContext('JSON.stringify(state)', context)); }
    };
}
module.exports = { setup };
