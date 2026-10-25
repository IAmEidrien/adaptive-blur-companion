// SPDX-License-Identifier: GPL-3.0-only
// Installed only by run-shell.py as a separate test extension. Real Shell + BMS.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Shell from 'gi://Shell';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const UUID = 'adaptive-blur-companion@eidrien.local';
const BMS = 'blur-my-shell@aunetx';
const delay = ms => new Promise(resolve => GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms,
    () => { resolve(); return GLib.SOURCE_REMOVE; }));
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const unpack = value => value.recursiveUnpack();

export default class Probe extends Extension {
    enable() {
        this._timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 4000, () => {
            this._timer = 0;
            this.run().catch(error => this.save({pass: false, error: String(error), stack: error.stack}));
            return GLib.SOURCE_REMOVE;
        });
    }
    disable() { if (this._timer) GLib.source_remove(this._timer); }
    save(result) {
        GLib.file_set_contents(`${GLib.getenv('ABC_TEST_ROOT')}/result.json`,
            JSON.stringify({shell: Config.PACKAGE_VERSION, checks: this.checks, ...result}, null, 2));
    }
    async run() {
        this.checks = [];
        const check = (ok, message) => { assert(ok, message); this.checks.push(message); };
        const manager = Main.extensionManager;
        const enable = async uuid => {
            assert(manager.enableExtension(uuid), `Discover ${uuid}`);
            await delay(1000);
            const info = manager.lookup(uuid);
            assert(info.state === 1, `Enable ${uuid}: ${info.state} ${info.error}`);
            return info.stateObj;
        };
        const disable = async uuid => { manager.disableExtension(uuid); await delay(700); };
        const shot = async name => {
            const stream = Gio.File.new_for_path(`${GLib.getenv('ABC_TEST_ROOT')}/${name}.png`)
                .replace(null, false, Gio.FileCreateFlags.NONE, null);
            await new Shell.Screenshot().screenshot(false, stream);
            stream.close(null);
        };
        const clean = () => !Main.uiGroup.has_style_class_name('opb-active') &&
            !Main.uiGroup.has_style_class_name('abc-light');
        const appearance = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        Main.overview.hide(); await delay(700);
        let companion = await enable(UUID);
        check(companion._lastWarning === 'missing' && !!companion._source,
            'Missing BMS creates a native warning');
        check(companion._source.title === companion.metadata.name, 'Warning source uses extension name');
        check(clean(), 'Missing dependency leaves backgrounds untouched');

        // Purpose-built native submenu, since private buses have no Wi-Fi/Bluetooth.
        const toggle = new QuickSettings.QuickMenuToggle({title: 'Compatibility fixture', toggleMode: true});
        toggle.menu.addMenuItem(new (await import('resource:///org/gnome/shell/ui/popupMenu.js')).PopupMenuItem('Fixture action'));
        Main.panel.statusArea.quickSettings.menu.addItem(toggle);
        let bms = await enable(BMS);
        const root = bms._settings.settings;
        let popup = bms._settings.popup.settings;
        popup.set_boolean('override-background', false);
        popup.set_boolean('blur', true);
        await delay(1200);
        check(bms._popup.enabled && bms._popup.surfaces.size > 0, 'Real BMS registers popup surfaces');
        check(companion._policy.targets.size > 0 && !companion._source, 'BMS activation recovers companion');
        const date = Main.panel.statusArea.dateMenu.menu;
        const quick = Main.panel.statusArea.quickSettings.menu;
        const targets = () => [...bms._popup.surfaces.keys()];
        const transparent = () => targets().filter(t => t.has_style_class_name('opb-transparent'));
        date.open(); await delay(500);
        check(transparent().length === 0, 'Outside Overview original popup backgrounds remain');
        await shot('outside-overview'); date.close();
        Main.overview.show(); await delay(1000);
        appearance.set_string('color-scheme', 'prefer-dark');
        date.open(); await delay(700);
        check(transparent().length > 0 && !Main.uiGroup.has_style_class_name('abc-light'),
            'Overview dark appearance styles registered surfaces');
        await shot('overview-dark');
        appearance.set_string('color-scheme', 'prefer-light'); await delay(500);
        check(Main.uiGroup.has_style_class_name('abc-light'), 'Light appearance updates native actor classes');
        await shot('overview-light'); date.close();
        quick.open(); toggle.menu.open(); await delay(700);
        const sheet = toggle.menu.box;
        check(!sheet.has_style_class_name('opb-transparent'), 'Quick Settings submenu stays excluded');
        check(sheet.get_theme_node().get_background_color().alpha === 255, 'Light submenu computes opaque background');
        await shot('quick-submenu-light');
        appearance.set_string('color-scheme', 'prefer-dark'); await delay(500);
        check(sheet.get_theme_node().get_background_color().alpha === 255, 'Dark submenu computes opaque background');
        toggle.menu.close(); quick.close();
        popup.set_boolean('override-background', true); await delay(700);
        check(clean() && transparent().length === 0 && companion._lastWarning === 'conflict',
            'Override conflict clears styling and creates warning');
        popup.set_boolean('override-background', false); await delay(700);
        check(transparent().length > 0, 'Override conflict recovers without logout');
        popup.set_boolean('blur', false); await delay(700);
        check(clean() && companion._lastWarning === 'blur-off', 'Popup blur off is guarded');
        popup.set_boolean('blur', true); await delay(900);
        check(transparent().length > 0, 'Popup blur on recovers');

        const settings = companion._ownSettings;
        const catalogVariant = root.get_value('pipelines');
        const catalog = unpack(catalogVariant);
        const ids = Object.keys(catalog);
        check(ids.length >= 2, 'Real BMS provides multiple existing pipelines');
        const overview = root.get_child('overview');
        const before = overview.get_string('pipeline');
        const alternate = ids.find(id => id !== before);
        settings.set_value('scheme-pipelines', new GLib.Variant('a{sa{ss}}',
            {overview: {light: alternate, dark: before}}));
        const request = async mode => {
            settings.set_string('pipeline-request', `${GLib.get_monotonic_time()}:${mode}`);
            await delay(350);
        };
        await request('light');
        check(overview.get_string('pipeline') === alternate, 'Manual apply works with automatic switching off');
        const snapshot = settings.get_value('revert-pipelines').print(true);
        await request('light');
        check(settings.get_value('revert-pipelines').print(true) === snapshot, 'No-op preserves revert snapshot');
        await request('revert');
        check(overview.get_string('pipeline') === before && Object.keys(unpack(settings.get_value('revert-pipelines'))).length === 0,
            'Revert restores previous selection and consumes snapshot');
        settings.set_boolean('scheme-pipelines-enabled', true);
        appearance.set_string('color-scheme', 'prefer-light'); await delay(500);
        check(overview.get_string('pipeline') === alternate, 'Automatic light switching uses appearance signal');
        appearance.set_string('color-scheme', 'prefer-dark'); await delay(500);
        check(overview.get_string('pipeline') === before, 'Automatic dark switching uses appearance signal');
        appearance.set_string('color-scheme', 'default'); await delay(500);
        check(overview.get_string('pipeline') === alternate, 'Default appearance resolves to light');
        settings.set_boolean('popup-backgrounds-enabled', false); await delay(500);
        check(clean(), 'Popup feature disables independently');
        await request('dark');
        check(overview.get_string('pipeline') === before, 'Pipeline feature works while popup feature is disabled');
        settings.set_boolean('scheme-pipelines-enabled', false);
        settings.set_value('scheme-pipelines', new GLib.Variant('a{sa{ss}}',
            {overview: {light: 'missing-test-pipeline'}}));
        const saved = settings.get_value('revert-pipelines').print(true);
        await request('light');
        check(settings.get_string('pipeline-result').startsWith('Error:') && overview.get_string('pipeline') === before &&
            settings.get_value('revert-pipelines').print(true) === saved, 'Invalid pipeline fails without writes or snapshot loss');
        check(root.get_value('pipelines').equal(catalogVariant), 'Pipeline definitions are unchanged');
        settings.set_boolean('popup-backgrounds-enabled', true); await delay(700);
        await disable(BMS);
        check(clean() && companion._lastWarning === 'missing', 'BMS disable removes styling and warns');
        bms = await enable(BMS); await delay(700);
        check(companion._policy.targets.size > 0, 'BMS re-enable reconnects new settings and surfaces');
        const owned = [...companion._policy.targets.keys()];
        companion._queue(); companion._settle();
        await disable(UUID);
        check(clean() && owned.every(t => !t.has_style_class_name('opb-transparent')),
            'Disable removes owned classes with callbacks pending');
        check(!companion._queueId && !companion._settleId && companion._signals.length === 0 &&
            companion._settingsSignals.length === 0 && !companion._source, 'Disable cancels sources and disconnects signals');
        companion = await enable(UUID);
        check(companion._policy.targets.size > 0, 'Companion re-enable works with BMS already running');
        await disable(UUID);
        toggle.destroy();
        this.save({pass: true, surfaces: bms._popup.surfaces.size});
    }
}
