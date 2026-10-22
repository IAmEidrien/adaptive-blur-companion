import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

// Small cascade fixture for the class/descendant/state selectors used below.
// This verifies selector reach and precedence, not GNOME rendering or parsing.
const css = readFileSync(new URL('../stylesheet.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
function actor(classes, parent = null, states = []) {
    return {classes: new Set(classes.split(' ')), parent, states: new Set(states)};
}
function matchesPart(part, node) {
    if (!node || /[>#\[\]]/.test(part)) return false;
    const type = part.match(/^[A-Za-z][\w-]*/)?.[0];
    if (type && node.type !== type) return false;
    return [...part.matchAll(/([.:])([\w-]+)/g)].every(([, kind, name]) =>
        (kind === '.' ? node.classes : node.states).has(name));
}
function matches(selector, node) {
    const parts = selector.trim().split(/\s+/);
    if (!matchesPart(parts.pop(), node)) return false;
    let parent = node.parent;
    for (const part of parts.reverse()) {
        while (parent && !matchesPart(part, parent)) parent = parent.parent;
        if (!parent) return false;
        parent = parent.parent;
    }
    return true;
}
function background(node) {
    let winner = null;
    rules.forEach(([, selectors, body], order) => {
        for (const selector of selectors.split(',')) {
            if (!matches(selector, node)) continue;
            const specificity = (selector.match(/[.:][\w-]+/g) ?? []).length;
            for (const declaration of body.split(';')) {
                const match = declaration.trim().match(/^background(?:-color)?:\s*(.*?)(\s*!important)?$/);
                if (!match) continue;
                const rank = (match[2] ? 1000 : 0) + specificity;
                if (!winner || rank > winner.rank || rank === winner.rank && order >= winner.order)
                    winner = {rank, order, value: match[1].trim()};
            }
        }
    });
    return winner?.value;
}

test('registered popup roots receive BMS dark tint, not a fully transparent fill', () => {
    for (const kind of ['popup-menu-content', 'quick-settings', 'notification-banner', 'message'])
        assert.equal(background(actor(`opb-transparent ${kind}`)), 'rgba(30, 30, 33, 0.5)');
});

test('notification cards and calendar contents are covered only under an Overview surface', () => {
    const root = actor('opb-transparent popup-menu-content');
    const message = actor('message', actor('message-list', root));
    assert.equal(background(message), 'rgba(255, 255, 255, 0.07)');
    assert.equal(background(actor('calendar', root)), 'transparent');
    assert.equal(background(actor('events-button', root)), 'rgba(255, 255, 255, 0.07)');
    root.classes.delete('opb-transparent');
    assert.equal(background(message), undefined);
    assert.equal(background(actor('calendar', root)), undefined);
});

test('top quick actions use translucent controls while checked toggles retain theme accents', () => {
    const quick = actor('opb-transparent quick-settings');
    const action = actor('icon-button', actor('quick-settings-system-item', quick));
    assert.equal(background(action), 'rgba(255, 255, 255, 0.1)');
    action.states.add('hover');
    assert.equal(background(action), 'rgba(255, 255, 255, 0.15)');
    assert.equal(background(actor('quick-toggle', quick, ['checked'])), undefined);
    assert.equal(background(actor('quick-toggle-menu-button', actor('quick-toggle-has-menu', quick))), undefined);
});

test('Quick Settings overlay sheets win against every borrowed translucent submenu rule', () => {
    const root = actor('opb-active');
    const quick = actor('quick-settings opb-transparent', root);
    assert.equal(background(actor('quick-toggle-menu', quick)), '#2e2e32');
    assert.equal(background(actor('quick-toggle-menu opb-transparent', quick)), '#2e2e32');
    quick.classes.delete('opb-transparent');
    assert.equal(background(actor('quick-toggle-menu', quick)), '#2e2e32');
});

test('copied styling has balanced rules, local scope, and no post-46 accent variables', () => {
    assert.equal((css.match(/\{/g) ?? []).length, (css.match(/\}/g) ?? []).length);
    assert.doesNotMatch(css, /-st-accent-color|\.bms-popup-/);
    for (const [, selectors] of rules)
        assert.ok(selectors.split(',').every(selector => selector.trim().startsWith('.opb-') || selector.trim().startsWith('.abc-light')));
});

test('light tint, readable controls and opaque sheets follow the appearance root', () => {
    const root = actor('opb-active abc-light');
    const quick = actor('opb-transparent quick-settings', root);
    assert.equal(background(quick), 'rgba(255, 255, 255, 0.65)');
    assert.equal(background(actor('icon-button', actor('quick-settings-system-item', quick))), 'rgba(0, 0, 0, 0.1)');
    assert.equal(background(actor('quick-toggle-menu', quick)), '#ebebed');
    root.classes.delete('abc-light');
    assert.equal(background(quick), 'rgba(30, 30, 33, 0.5)');
    assert.equal(background(actor('quick-toggle-menu', quick)), '#2e2e32');
});
