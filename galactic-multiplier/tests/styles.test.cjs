const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const fixes = fs.readFileSync(path.join(__dirname, '..', 'fixes.css'), 'utf8');

// Concatenated declaration blocks of every `selector { ... }` rule in `css` (a selector may be styled in several places).
function ruleBody(css, selector) {
    let out = '', from = 0, start;
    while ((start = css.indexOf(selector + ' {', from)) >= 0) {
        const open = css.indexOf('{', start);
        out += css.slice(open + 1, css.indexOf('}', open)) + ';';
        from = open;
    }
    assert.ok(out, `rule ${selector} exists`);
    return out;
}

test('.pop-in is visible without its animation (reduced motion / animation disabled)', () => {
    const body = ruleBody(html, '.pop-in');
    assert.doesNotMatch(body, /opacity\s*:\s*0/, 'a hidden base state makes the question numbers vanish when animations are off');
    assert.doesNotMatch(body, /transform\s*:/, 'start transform belongs in the keyframes');
    assert.match(html, /@keyframes popIn\s*{\s*from\s*{[^}]*opacity:\s*0/, 'hidden start state is in the keyframes');
});

test('gradient title does not use a text-shadow (iOS paints it through the transparent fill)', () => {
    const h1 = html.match(/<h1 id="appTitle" class="([^"]*)"/);
    assert.ok(h1, 'title found');
    assert.doesNotMatch(h1[1], /neon-text/);
    assert.match(ruleBody(fixes, '#appTitle'), /text-shadow:\s*none/);
});
