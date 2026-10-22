// SPDX-License-Identifier: GPL-3.0-only
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export const LABELS = {
    overview: 'Overview', popup: 'Popups', appfolder: 'App folders',
    panel: 'Panel', 'dash-to-dock': 'Dash to Dock', applications: 'Applications',
    screenshot: 'Screenshot', lockscreen: 'Lock screen', 'window-list': 'Window list',
    'coverflow-alt-tab': 'Coverflow Alt-Tab',
};

export function unpack(value) {
    if (typeof value?.deep_unpack === 'function') return unpack(value.deep_unpack());
    if (Array.isArray(value)) return value.map(unpack);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, unpack(v)]));
    return value;
}

export function findBmsSettings() {
    const id = 'org.gnome.shell.extensions.blur-my-shell';
    const parent = Gio.SettingsSchemaSource.get_default();
    let schema = parent?.lookup(id, true);
    if (schema) return new Gio.Settings({settings_schema: schema});
    const roots = [GLib.get_user_data_dir(), ...GLib.get_system_data_dirs()];
    for (const root of roots) {
        const path = GLib.build_filenamev([root, 'gnome-shell', 'extensions', 'blur-my-shell@aunetx', 'schemas']);
        try {
            const source = Gio.SettingsSchemaSource.new_from_directory(path, parent, false);
            schema = source.lookup(id, true);
            if (schema) return new Gio.Settings({settings_schema: schema});
        } catch { /* An extension need not be installed in every data directory. */ }
    }
    return null;
}

export class BmsPipelineStore {
    constructor(root) {
        if (!root?.settings_schema?.has_key('pipelines'))
            throw new Error('This Blur my Shell version does not expose pipeline settings');
        this.root = root;
        this.children = new Map();
        for (const name of root.list_children()) {
            const child = root.get_child(name);
            if (child.settings_schema.has_key('pipeline')) this.children.set(name, child);
        }
    }
    catalog() { return unpack(this.root.get_value('pipelines')); }
    components() { return [...this.children.keys()]; }
    read(name) { return this.children.get(name).get_string('pipeline'); }
    writable(name) { return this.children.get(name).is_writable('pipeline'); }
    write(name, value) { return this.children.get(name).set_string('pipeline', value); }
}
