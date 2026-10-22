import assert from 'node:assert/strict';
import test from 'node:test';
import {PipelineController, resolveScheme} from '../pipelines.js';
function fixture() {
    const values = {overview: 'old', popup: 'old'};
    let saved = {};
    const writes = [];
    const store = {
        catalog: () => ({old: {}, light: {}, dark: {}}), components: () => Object.keys(values),
        read: k => values[k], writable: () => true,
        write: (k, v) => {writes.push([k, v]); values[k] = v; return true;},
    };
    const undo = {read: () => saved, write: v => {saved = v; return true;}};
    return {store, undo, values, writes, controller: new PipelineController(store, undo)};
}
test('GNOME default and prefer-light resolve to light, prefer-dark to dark', () => {
    assert.equal(resolveScheme('default'), 'light');
    assert.equal(resolveScheme('prefer-light'), 'light');
    assert.equal(resolveScheme('prefer-dark'), 'dark');
});
test('one-level snapshot is overwritten by changes, retained by no-op and consumed by revert', () => {
    const f = fixture();
    const config = {overview: {light: 'light', dark: 'dark'}, popup: {light: '', dark: ''}};
    f.controller.apply('dark', config);
    assert.deepEqual(f.undo.read(), {overview: 'old'});
    f.controller.apply('dark', config);
    assert.deepEqual(f.undo.read(), {overview: 'old'});
    f.controller.apply('light', config);
    assert.deepEqual(f.undo.read(), {overview: 'dark'});
    assert.equal(f.values.popup, 'old');
    f.controller.revert();
    assert.equal(f.values.overview, 'dark');
    assert.deepEqual(f.undo.read(), {});
    assert.deepEqual(f.controller.revert(), {changed: 0, reverted: false});
});
test('validation checks all targets before writing and leaves snapshot intact on missing pipeline', () => {
    const f = fixture(); f.undo.write({popup: 'old'});
    assert.throws(() => f.controller.apply('light', {overview: {light: 'light'}, popup: {light: 'deleted'}}), /missing/);
    assert.deepEqual(f.writes, []); assert.deepEqual(f.undo.read(), {popup: 'old'});
    f.store.writable = k => k !== 'popup';
    assert.throws(() => f.controller.apply('light', {overview: {light: 'light'}, popup: {light: 'light'}}), /read-only/);
    assert.deepEqual(f.writes, []);
});
test('failed second component rolls back the first and preserves the prior snapshot', () => {
    const f = fixture(); f.undo.write({overview: 'dark'});
    const write = f.store.write;
    f.store.write = (k, v) => k === 'popup' ? false : write(k, v);
    assert.throws(() => f.controller.apply('light', {overview: {light: 'light'}, popup: {light: 'light'}}), /Could not apply/);
    assert.deepEqual(f.values, {overview: 'old', popup: 'old'});
    assert.deepEqual(f.undo.read(), {overview: 'dark'});
});
test('snapshot failure rolls back selections; rollback errors identify unrestored components', () => {
    const f = fixture(); f.undo.write = () => false;
    assert.throws(() => f.controller.apply('dark', {overview: {dark: 'dark'}}), /snapshot/);
    assert.equal(f.values.overview, 'old');
    f.store.write = (_k, v) => {if (v === 'old') throw new Error('offline'); return true;};
    assert.throws(() => f.controller.apply('dark', {overview: {dark: 'dark'}}), /could not restore: overview/);
});
test('revert to a deleted pipeline fails without consuming the snapshot', () => {
    const f = fixture(); f.undo.write({overview: 'deleted'});
    assert.throws(() => f.controller.revert(), /missing/);
    assert.deepEqual(f.undo.read(), {overview: 'deleted'});
    assert.deepEqual(f.writes, []);
});
