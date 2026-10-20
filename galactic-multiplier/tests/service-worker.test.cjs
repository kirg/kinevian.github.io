const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function worker(options = {}) {
    const events = new Map();
    const stores = new Map();
    let fetches = [];
    let offline = false;
    const claimed = [];
    const cacheFor = name => {
        if (!stores.has(name)) stores.set(name, new Map());
        const data = stores.get(name);
        return {
            addAll: async requests => { for (const r of requests) data.set(r.url, new Response('installed:' + r.url)); },
            put: async (key, response) => {
                if (options.writeDenied) throw new Error('Quota exceeded');
                data.set(typeof key === 'string' ? key : key.url, response);
            },
            match: async key => data.get(typeof key === 'string' ? key : key.url)?.clone()
        };
    };
    const self = {
        registration: { scope: 'https://kinevian.com/galactic-multiplier/' },
        location: { origin: 'https://kinevian.com' },
        clients: { claim: async () => claimed.push('claimed') },
        skipWaiting: async () => claimed.push('skipped'),
        addEventListener: (type, fn) => events.set(type, fn)
    };
    const context = vm.createContext({
        self, URL, Request, Response, AbortController, setTimeout, clearTimeout,
        caches: {
            open: async name => {
                if (options.openDenied) throw new Error('Storage denied');
                return cacheFor(name);
            },
            keys: async () => [...stores.keys()],
            delete: async name => stores.delete(name)
        },
        fetch: async request => {
            if (offline) throw new Error('Offline');
            fetches.push(request.url);
            return new Response('fresh:' + request.url);
        }
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'service-worker.js'), 'utf8'), context);
    const lifecycle = async type => {
        let pending;
        events.get(type)({ waitUntil: promise => pending = promise });
        await pending;
    };
    const fetch = async (url, mode = 'cors', method = 'GET') => {
        let response;
        events.get('fetch')({ request: { url, mode, method }, respondWith: promise => response = promise });
        return await response;
    };
    return { stores, claimed, lifecycle, fetch, fetches, set offline(value) { offline = value; } };
}
test('installation caches only a complete local shell', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    const urls = [...sw.stores.get('galactic-multiplier-v14').keys()];
    assert.equal(urls.length, 22);
    assert.ok(urls.every(url => url.startsWith('https://kinevian.com/galactic-multiplier/')));
    assert.ok(urls.some(url => url.endsWith('/numbers.js')));
    assert.ok(urls.some(url => url.endsWith('/style.css')));
    assert.deepEqual(sw.claimed, ['skipped']);
});
test('activation removes old game caches while retaining unrelated apps', async () => {
    const sw = worker();
    sw.stores.set('galactic-multiplier-v9', new Map());
    sw.stores.set('galactic-multiplier-v13', new Map());
    sw.stores.set('geobingo-v1', new Map());
    await sw.lifecycle('install');
    await sw.lifecycle('activate');
    assert.equal(sw.stores.has('galactic-multiplier-v9'), false);
    assert.equal(sw.stores.has('galactic-multiplier-v13'), false);
    assert.equal(sw.stores.has('geobingo-v1'), true);
    assert.deepEqual(sw.claimed, ['skipped', 'claimed']);
});
test('online navigation refreshes cached HTML and offline / and query URLs use it', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    const shell = 'https://kinevian.com/galactic-multiplier/';
    const fresh = await sw.fetch(shell, 'navigate');
    assert.equal(await fresh.text(), 'fresh:' + shell);
    sw.offline = true;
    for (const url of [shell, shell + '?source=home', shell + 'index.html']) {
        const response = await sw.fetch(url, 'navigate');
        assert.equal(await response.text(), 'fresh:' + shell);
    }
});
test('scripts update online and fall back to cached copies offline', async () => {
    const sw = worker();
    await sw.lifecycle('install');
    const url = 'https://kinevian.com/galactic-multiplier/numbers.js';
    assert.equal(await (await sw.fetch(url)).text(), 'fresh:' + url);
    sw.offline = true;
    assert.equal(await (await sw.fetch(url)).text(), 'fresh:' + url);
});
test('worker leaves other apps, cross-origin requests, and non-GET requests alone', async () => {
    const sw = worker();
    for (const [url, mode, method] of [
        ['https://kinevian.com/geobingo/', 'navigate', 'GET'],
        ['https://example.com/numbers.js', 'cors', 'GET'],
        ['https://kinevian.com/galactic-multiplier/numbers.js', 'cors', 'POST']
    ]) assert.equal(await sw.fetch(url, mode, method), undefined);
    assert.equal(sw.fetches.length, 0);
});
test('missing offline shell returns a useful 503 instead of an unhandled rejection', async () => {
    const sw = worker();
    sw.offline = true;
    const response = await sw.fetch('https://kinevian.com/galactic-multiplier/', 'navigate');
    assert.equal(response.status, 503);
    assert.match(await response.text(), /Connect once/);
});
test('cache quota and storage denial do not discard a working online response', async () => {
    for (const options of [{ writeDenied: true }, { openDenied: true }]) {
        const sw = worker(options);
        const url = 'https://kinevian.com/galactic-multiplier/numbers.js';
        assert.equal(await (await sw.fetch(url)).text(), 'fresh:' + url);
    }
});
