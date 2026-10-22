// Real GJS/GTK/GSettings smoke check. A display server and test schemas are required.
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {BmsPipelineStore, findBmsSettings, unpack} from '../bms-settings.js';
import {PipelineController} from '../pipelines.js';
const assert = (v, message) => {if (!v) throw new Error(message);};
Adw.init();
const settings = new Gio.Settings({schema_id: 'org.gnome.shell.extensions.adaptive-blur-companion'});
const root = findBmsSettings();
assert(root, 'BMS fixture schema was found');
root.set_value('pipelines', new GLib.Variant('a{sa{sv}}', {
    old: {name: new GLib.Variant('s', 'Original')},
    light: {name: new GLib.Variant('s', 'Light')},
    dark: {name: new GLib.Variant('s', 'Dark')},
}));
settings.set_value('scheme-pipelines', new GLib.Variant('a{sa{ss}}', {overview: {light: 'light', dark: 'dark'}}));
assert(unpack(settings.get_value('scheme-pipelines')).overview.light === 'light', 'Nested variant round-trip');
const store = new BmsPipelineStore(root);
assert(store.catalog().light.name === 'Light', 'Nested BMS variants unpack');
const controller = new PipelineController(store, {
    read: () => unpack(settings.get_value('revert-pipelines')),
    write: value => settings.set_value('revert-pipelines', new GLib.Variant('a{ss}', value)),
});
controller.apply('light', unpack(settings.get_value('scheme-pipelines')));
assert(store.read('overview') === 'light', 'Real GSettings apply');
controller.revert();
assert(store.read('overview') === 'old', 'Real GSettings revert');
// Substitute only the Shell-specific base class; use the actual preferences body
// and native GTK/Adwaita widgets, BMS adapter and Gio.Settings.
const path = GLib.build_filenamev([GLib.get_current_dir(), 'prefs.js']);
const [, bytes] = GLib.file_get_contents(path);
const source = new TextDecoder().decode(bytes).replace(
    /import \{ExtensionPreferences\} from [^;]+;/,
    `class ExtensionPreferences {
        get uuid() {return 'adaptive-blur-companion@eidrien.local';}
        getSettings() {return new Gio.Settings({schema_id: 'org.gnome.shell.extensions.adaptive-blur-companion'});}
    }`);
const temp = GLib.build_filenamev([GLib.get_current_dir(), '.prefs-smoke.js']);
GLib.file_set_contents(temp, source);
try {
    const {default: Preferences} = await import(Gio.File.new_for_path(temp).get_uri());
    const shell = new Gio.Settings({schema_id: 'org.gnome.shell'});
    shell.set_strv('enabled-extensions', ['adaptive-blur-companion@eidrien.local', 'blur-my-shell@aunetx']);
    const window = new Adw.PreferencesWindow();
    new Preferences().fillPreferencesWindow(window);
    window.present();
    while (GLib.MainContext.default().pending()) GLib.MainContext.default().iteration(false);
    assert(window.get_visible_page().title === 'Pop-up backgrounds', 'First page title');
    // Exercise external GSettings updates and catalog rebuilds while window lives.
    settings.set_string('pipeline-result', 'Native smoke check');
    root.set_value('pipelines', root.get_value('pipelines'));
    window.close();
    print('Native GJS/GTK preferences, schema variants, apply and revert passed');
} finally { GLib.unlink(temp); }
