import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {BackgroundPolicy, dependency, BMS_UUID, ACTIVE_CLASS, TRANSPARENT_CLASS,
    inQuickSubmenu} from '../policy.js';

class Signals {
    listeners = new Map();
    next = 1;
    connect(name, callback) {
        const id = this.next++;
        this.listeners.set(id, {name, callback});
        return id;
    }
    disconnect(id) { assert.ok(this.listeners.delete(id)); }
    emit(name, ...args) {
        for (const listener of [...this.listeners.values()]) {
            if (listener.name === name)
                listener.callback(this, ...args);
        }
    }
}
class Actor extends Signals {
    classes = new Set();
    style = 'border-radius: 24px;';
    parent = null;
    get_stage() { return {}; }
    get_parent() { return this.parent; }
    has_style_class_name(name) { return this.classes.has(name); }
    add_style_class_name(name) { this.classes.add(name); }
    remove_style_class_name(name) { this.classes.delete(name); }
    destroy() { this.emit('destroy'); this.listeners.clear(); }
}
function fixture() {
    const target = new Actor();
    const settings = new Signals();
    settings.values = {'blur': true, 'override-background': false};
    settings.get_boolean = key => {
        assert.ok(key in settings.values);
        return settings.values[key];
    };
    const component = {enabled: true, surfaces: new Map([[target, {actor: new Actor()}]])};
    const bms = {_popup: component, _settings: {popup: {settings}},
        preferences: 0, openPreferences() { this.preferences++; }};
    const info = {uuid: BMS_UUID, state: 1, stateObj: bms};
    const root = new Actor();
    const tasks = new Map();
    let next = 1;
    const schedule = callback => { const id = next++; tasks.set(id, callback); return id; };
    const sources = [];
    class Source extends Signals {
        constructor(props) { super(); Object.assign(this, props); this.notifications = []; }
        addNotification(notification) { this.notifications.push(notification); }
        destroy(reason) { assert.equal(reason, 3); this.emit('destroy'); }
    }
    class Notification {
        constructor(props) { Object.assign(this, props); this.actions = []; }
        addAction(label, callback) { this.actions.push({label, callback}); }
    }
    const Main = {
        uiGroup: root,
        overview: Object.assign(new Signals(), {visible: false}),
        extensionManager: Object.assign(new Signals(), {lookup: () => info}),
        layoutManager: {}, panel: {statusArea: {quickSettings: {menu: new Signals()}}},
        messageTray: {add: source => sources.push(source)},
    };
    const source = readFileSync(new URL('../extension.js', import.meta.url), 'utf8')
        .replace(/^import .*;\n/gm, '')
        .replace('export default class', 'class');
    const ExtensionClass = vm.runInNewContext(`${source}; OverviewPopupBackgrounds`, {
        Extension: class {metadata = {name: 'Dynamic Overview Popup Backgrounds'};},
        GLib: {PRIORITY_DEFAULT: 0, PRIORITY_DEFAULT_IDLE: 0, SOURCE_REMOVE: false,
            idle_add: (_p, callback) => schedule(callback),
            timeout_add: (_p, _ms, callback) => schedule(callback),
            source_remove: id => tasks.delete(id)},
        Main, MessageTray: {Source, Notification, NotificationDestroyedReason: {SOURCE_CLOSED: 3}}, global: {}, console,
        BackgroundPolicy, BMS_UUID, dependency,
    });
    const extension = new ExtensionClass();
    return {extension, Main, root, target, component, settings, info, bms, tasks, sources,
        flush() {
            let count = 0;
            while (tasks.size) {
                assert.ok(++count < 50, 'no persistent polling');
                const [id, callback] = tasks.entries().next().value;
                tasks.delete(id); callback();
            }
        }};
}

test('dependency guards reject missing, old, disabled and conflicting BMS', () => {
    const f = fixture();
    assert.equal(dependency(null).reason, 'missing');
    assert.equal(dependency({state: 1, stateObj: {}}).reason, 'unsupported');
    assert.equal(dependency(f.info).reason, 'active');
    f.settings.values.blur = false;
    assert.equal(dependency(f.info).reason, 'blur-off');
    f.settings.values.blur = true;
    f.settings.values['override-background'] = true;
    assert.equal(dependency(f.info).reason, 'conflict');
    f.settings.values['override-background'] = false;
    f.component.enabled = false;
    assert.equal(dependency(f.info).reason, 'waiting');
});

test('only registered surfaces receive Overview styling and inline styles survive', () => {
    const f = fixture();
    f.extension.enable(); f.flush();
    assert.ok(f.root.classes.has(ACTIVE_CLASS));
    assert.ok(!f.target.classes.has(TRANSPARENT_CLASS));
    f.Main.overview.emit('showing');
    assert.ok(f.target.classes.has(TRANSPARENT_CLASS));
    assert.equal(f.target.style, 'border-radius: 24px;');
    f.Main.overview.emit('hiding');
    assert.ok(!f.target.classes.has(TRANSPARENT_CLASS));
    f.extension.disable();
    assert.ok(!f.root.classes.has(ACTIVE_CLASS));
});

test('Quick Settings submenus and their descendants are exempt in every Overview state', () => {
    const f = fixture();
    const sheet = new Actor(); sheet.classes.add('quick-toggle-menu');
    f.target.parent = sheet;
    f.component.surfaces.set(sheet, {actor: new Actor()});
    assert.equal(inQuickSubmenu(f.target), true);
    f.extension.enable(); f.flush(); f.Main.overview.emit('showing');
    assert.ok(!f.target.classes.has(TRANSPARENT_CLASS));
    assert.ok(!sheet.classes.has(TRANSPARENT_CLASS));
    const css = readFileSync(new URL('../stylesheet.css', import.meta.url), 'utf8');
    assert.match(css, /\.opb-active \.quick-toggle-menu[\s\S]*background: #2e2e32 !important/);
    f.extension.disable();
});

test('conflict notifications use a named native source, preferences action, and deduplication', () => {
    const f = fixture();
    f.settings.values['override-background'] = true;
    f.extension.enable(); f.flush();
    assert.ok(!f.root.classes.has(ACTIVE_CLASS));
    assert.equal(f.sources.length, 1);
    const source = f.sources[0];
    assert.equal(source.title, 'Dynamic Overview Popup Backgrounds');
    assert.equal(source.iconName, 'preferences-desktop-appearance-symbolic');
    const notification = source.notifications[0];
    assert.match(notification.body, /turn off Override background/);
    notification.actions[0].callback();
    assert.equal(f.bms.preferences, 1);
    f.extension._settle(); f.flush();
    assert.equal(f.sources.length, 1);
    f.settings.values['override-background'] = false;
    f.settings.emit('changed::override-background'); f.flush();
    assert.ok(f.root.classes.has(ACTIVE_CLASS));
    assert.equal(f.extension._source, null);
    assert.equal(f.settings.values['override-background'], false);
    f.extension.disable();
});

test('dependency load order, live disable and re-enable restore backgrounds automatically', () => {
    const f = fixture();
    f.info.state = 2;
    f.extension.enable(); f.flush();
    assert.ok(!f.root.classes.has(ACTIVE_CLASS));
    f.info.state = 1;
    f.Main.extensionManager.emit('extension-state-changed', f.info); f.flush();
    f.Main.overview.emit('showing');
    assert.ok(f.target.classes.has(TRANSPARENT_CLASS));
    f.info.state = 2;
    f.Main.extensionManager.emit('extension-state-changed', f.info);
    assert.ok(!f.target.classes.has(TRANSPARENT_CLASS));
    f.flush();
    f.info.state = 1;
    f.Main.extensionManager.emit('extension-state-changed', f.info); f.flush();
    assert.ok(f.target.classes.has(TRANSPARENT_CLASS));
    f.extension.disable();
});

test('lazy surfaces are tracked after insertion and detached surfaces release owned styles', () => {
    const f = fixture();
    f.extension.enable(); f.flush(); f.Main.overview.emit('showing');
    const late = new Actor();
    f.root.emit('child-added', new Actor());
    f.component.surfaces.set(late, {actor: new Actor()});
    f.flush();
    assert.ok(late.classes.has(TRANSPARENT_CLASS));
    f.component.surfaces.delete(late);
    f.root.emit('child-removed', new Actor()); f.flush();
    assert.ok(!late.classes.has(TRANSPARENT_CLASS));
    f.target.destroy();
    assert.equal(f.extension._policy.targets.size, 0);
    f.component.surfaces.delete(f.target);
    f.extension.disable();
});

test('disabling cancels queued work, signals, notification and styles without changing settings', () => {
    const f = fixture();
    f.extension.enable(); f.flush(); f.Main.overview.emit('showing');
    f.root.emit('child-added', new Actor()); f.extension._settle();
    f.extension.disable();
    assert.equal(f.tasks.size, 0);
    for (const object of [f.root, f.settings, f.Main.overview, f.Main.extensionManager])
        assert.equal(object.listeners.size, 0);
    assert.ok(!f.target.classes.has(TRANSPARENT_CLASS));
    assert.equal(f.settings.values.blur, true);
    assert.equal(f.settings.values['override-background'], false);
    assert.doesNotThrow(() => f.extension.disable());
});

test('policy does not remove an existing class it did not add', () => {
    const f = fixture();
    f.target.classes.add(TRANSPARENT_CLASS);
    const policy = new BackgroundPolicy(f.root);
    policy.apply(f.component.surfaces, true); policy.clear();
    assert.ok(f.target.classes.has(TRANSPARENT_CLASS));
});
