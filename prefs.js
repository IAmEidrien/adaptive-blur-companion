// SPDX-License-Identifier: GPL-3.0-only
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {BMS_UUID} from './policy.js';
import {BmsPipelineStore, findBmsSettings, LABELS, unpack} from './bms-settings.js';

export default class CompanionPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const signals = [];
        const watch = (object, name, callback) => signals.push([object, object.connect(name, callback)]);
        window.set_default_size(760, 700);

        const popup = new Adw.PreferencesPage({title: 'Pop-up backgrounds', icon_name: 'view-reveal-symbolic'});
        const popupGroup = new Adw.PreferencesGroup({title: 'Overview backgrounds', description:
            'Reveal Blur my Shell popup blur in Overview, with a light or dark tint matching GNOME. Outside Overview, use your shell theme backgrounds. Quick Settings overlay sheets stay opaque.'});
        const popupSwitch = new Adw.SwitchRow({title: 'Adapt pop-up backgrounds', subtitle:
            'Requires Blur my Shell Popups blur on and its Override background off.'});
        settings.bind('popup-backgrounds-enabled', popupSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        popupGroup.add(popupSwitch);
        popup.add(popupGroup);
        window.add(popup);

        const page = new Adw.PreferencesPage({title: 'Scheme pipelines', icon_name: 'preferences-desktop-appearance-symbolic'});
        const automatic = new Adw.PreferencesGroup({title: 'Follow GNOME appearance', description:
            'Create and edit pipelines in Blur my Shell, then choose them below. Dark style uses the dark selections; light or default style uses the light selections. Empty selections leave that component alone.'});
        const autoSwitch = new Adw.SwitchRow({title: 'Switch pipelines automatically', subtitle:
            'Apply on appearance changes, when enabled, and when Blur my Shell becomes available.'});
        settings.bind('scheme-pipelines-enabled', autoSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        automatic.add(autoSwitch);
        page.add(automatic);

        const actions = new Adw.PreferencesGroup({title: 'Apply pipelines'});
        const applyRow = new Adw.ActionRow({title: 'Apply a set now', subtitle: 'Available with automatic switching on or off.'});
        const buttons = [];
        const request = mode => settings.set_string('pipeline-request', `${GLib.get_monotonic_time()}:${mode}`);
        for (const [label, mode] of [['Light', 'light'], ['Dark', 'dark']]) {
            const button = new Gtk.Button({label, valign: Gtk.Align.CENTER});
            button.connect('clicked', () => request(mode));
            buttons.push(button);
            applyRow.add_suffix(button);
        }
        actions.add(applyRow);
        const undoRow = new Adw.ActionRow({title: 'Revert last application', subtitle:
            'Restore the previous selections once. The next application replaces this snapshot.'});
        const revert = new Gtk.Button({label: 'Revert', valign: Gtk.Align.CENTER});
        revert.connect('clicked', () => request('revert'));
        undoRow.add_suffix(revert);
        actions.add(undoRow);
        const status = new Gtk.Label({wrap: true, xalign: 0, margin_top: 12, selectable: true});
        actions.add(status);
        page.add(actions);

        const choices = new Adw.PreferencesGroup({title: 'Component pipelines'});
        page.add(choices);
        window.add(page);
        const shell = new Gio.Settings({schema_id: 'org.gnome.shell'});
        let root = findBmsSettings();
        let rows = [];
        const sensitivity = () => {
            const enabled = shell.get_strv('enabled-extensions');
            const active = enabled.includes(this.uuid) && enabled.includes(BMS_UUID)
                && !shell.get_boolean('disable-user-extensions');
            for (const button of buttons) button.sensitive = active && Boolean(root);
            revert.sensitive = active && Boolean(root)
                && Object.keys(unpack(settings.get_value('revert-pipelines'))).length > 0;
            status.label = !active ? 'Enable this companion and Blur my Shell to apply pipelines.'
                : settings.get_string('pipeline-result');
        };
        const refresh = () => {
            const expanded = new Set(rows.filter(row => row.expanded).map(row => row._component));
            for (const row of rows) choices.remove(row);
            rows = [];
            if (!root) {
                const row = new Adw.ActionRow({title: 'Blur my Shell pipeline settings are unavailable',
                    subtitle: 'Install Blur my Shell, then reopen these preferences.'});
                rows.push(row); choices.add(row); sensitivity(); return;
            }
            try {
                const store = new BmsPipelineStore(root);
                const catalog = store.catalog();
                const assignments = unpack(settings.get_value('scheme-pipelines'));
                const components = store.components().sort((a, b) =>
                    (a === 'overview' ? -1 : b === 'overview' ? 1 :
                        a === 'popup' ? -1 : b === 'popup' ? 1 : a.localeCompare(b)));
                for (const component of components) {
                    const row = new Adw.ExpanderRow({title: LABELS[component] ?? component,
                        subtitle: `Current: ${catalog[store.read(component)]?.name ?? store.read(component)}`,
                        expanded: expanded.has(component)});
                    row._component = component;
                    for (const mode of ['light', 'dark']) {
                        const selected = assignments[component]?.[mode] ?? '';
                        const ids = ['', ...Object.keys(catalog)];
                        if (selected && !ids.includes(selected)) ids.push(selected);
                        const names = ids.map(id => id === '' ? 'Leave unchanged'
                            : catalog[id]?.name ?? `Missing pipeline: ${id}`);
                        const combo = new Adw.ComboRow({title: mode === 'light' ? 'Light style' : 'Dark style',
                            model: Gtk.StringList.new(names), selected: Math.max(0, ids.indexOf(selected))});
                        combo.connect('notify::selected', () => {
                            const map = unpack(settings.get_value('scheme-pipelines'));
                            map[component] = {...map[component], [mode]: ids[combo.selected] ?? ''};
                            settings.set_value('scheme-pipelines', new GLib.Variant('a{sa{ss}}', map));
                        });
                        row.add_row(combo);
                    }
                    rows.push(row); choices.add(row);
                }
            } catch (error) {
                const row = new Adw.ActionRow({title: 'Pipeline settings are unavailable', subtitle: error.message});
                rows.push(row); choices.add(row);
            }
            sensitivity();
        };
        if (root) watch(root, 'changed::pipelines', refresh);
        watch(settings, 'changed::revert-pipelines', sensitivity);
        watch(settings, 'changed::pipeline-result', refresh);
        watch(shell, 'changed::enabled-extensions', sensitivity);
        watch(shell, 'changed::disable-user-extensions', sensitivity);
        refresh();
        window.connect('close-request', () => {
            for (const [object, id] of signals) object.disconnect(id);
            root = null;
            return false;
        });
    }
}
