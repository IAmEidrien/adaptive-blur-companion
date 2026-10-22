// SPDX-License-Identifier: GPL-3.0-only
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import {BackgroundPolicy, BMS_UUID, dependency} from './policy.js';
import {PipelineController, resolveScheme} from './pipelines.js';
import {BmsPipelineStore, unpack} from './bms-settings.js';

const MESSAGES = {
    missing: ['Blur my Shell is not enabled',
        'Enable Blur my Shell and its Popups blur to use the companion’s pop-up effect.'],
    unsupported: ['Popup integration is unavailable',
        'This Blur my Shell version does not expose the supported modern popup component. No backgrounds have been changed.'],
    'blur-off': ['Enable popup blur',
        'Enable Popups blur in Blur my Shell. The pop-up effect will activate automatically.'],
    conflict: ['Disable “Override background” in Blur my Shell',
        'In Blur my Shell → Popups, turn off Override background. The companion’s pop-up effect is inactive until you do; this setting will not be changed automatically.'],
};

export default class AdaptiveBlurCompanion extends Extension {
    enable() {
        this._enabled = true;
        this._signals = [];
        this._settingsSignals = [];
        this._settings = null;
        this._queueId = 0;
        this._settleId = 0;
        this._source = null;
        this._lastWarning = null;
        this._ownSettings = this.getSettings();
        this._appearance = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._scheme = resolveScheme(this._appearance.get_string('color-scheme'));
        this._overview = Main.overview.visible;
        this._policy = new BackgroundPolicy(Main.uiGroup);
        this._connect(this._appearance, 'changed::color-scheme', () => {
            this._scheme = resolveScheme(this._appearance.get_string('color-scheme'));
            this._sync();
            this._applyAuto();
        });
        this._connect(this._ownSettings, 'changed::popup-backgrounds-enabled', () => {
            this._sync();
            this._settle();
        });
        this._connect(this._ownSettings, 'changed::scheme-pipelines-enabled', () => this._applyAuto());
        this._connect(this._ownSettings, 'changed::pipeline-request', () => {
            const mode = this._ownSettings.get_string('pipeline-request').split(':').at(-1);
            this._applyPipelines(mode);
        });
        this._connect(Main.overview, 'showing', () => {
            this._overview = true;
            this._sync();
        });
        this._connect(Main.overview, 'hiding', () => {
            this._overview = false;
            this._sync();
        });
        this._connect(Main.extensionManager, 'extension-state-changed', (_manager, info) => {
            if (info.uuid !== BMS_UUID)
                return;
            // Restore immediately on dependency disable; defer reactivation
            // until its enable/settings callbacks have finished.
            if (info.state !== 1)
                this._policy.clear();
            this._queue();
            this._settle();
            if (info.state === 1) this._applyAuto();
        });
        // BMS adds each blur surface to one of these groups. Observe additions,
        // not the full actor tree, and coalesce them after BMS registers its map.
        const roots = new Set([Main.uiGroup, Main.layoutManager.modalDialogGroup,
            Main.layoutManager.screenShieldGroup, Main.screenshotUI, global.window_group]);
        for (const root of roots) {
            if (!root)
                continue;
            this._connect(root, 'child-added', () => this._queue());
            this._connect(root, 'child-removed', () => this._queue());
        }
        // Also catches lazy popup creation before its blur surface is inserted.
        this._connect(Main.panel.statusArea.quickSettings.menu, 'open-state-changed', () => {
            this._queue();
            this._settle();
        });
        this._queue();
        this._settle();
        this._applyAuto();
    }

    _applyAuto() {
        if (this._ownSettings.get_boolean('scheme-pipelines-enabled'))
            this._applyPipelines(this._scheme);
    }

    _applyPipelines(mode) {
        try {
            const info = Main.extensionManager.lookup(BMS_UUID);
            if (info?.state !== 1)
                throw new Error('Enable Blur my Shell to apply pipelines');
            const store = new BmsPipelineStore(info.stateObj?._settings?.settings);
            const undo = {
                read: () => unpack(this._ownSettings.get_value('revert-pipelines')),
                write: value => this._ownSettings.set_value('revert-pipelines', new GLib.Variant('a{ss}', value)),
            };
            const controller = new PipelineController(store, undo);
            const result = mode === 'revert' ? controller.revert()
                : controller.apply(mode, unpack(this._ownSettings.get_value('scheme-pipelines')));
            const text = mode === 'revert' ? `Reverted ${result.changed} pipeline selection(s).`
                : result.changed ? `Applied ${mode} pipelines to ${result.changed} component(s).`
                    : `No pipeline selections changed for ${mode} style.`;
            this._ownSettings.set_string('pipeline-result', text);
        } catch (error) {
            this._ownSettings.set_string('pipeline-result', `Error: ${error.message}`);
        }
    }

    _connect(object, signal, callback) {
        this._signals.push([object, object.connect(signal, callback)]);
    }

    _bindSettings(settings) {
        if (settings === this._settings)
            return;
        for (const [object, id] of this._settingsSignals)
            object.disconnect(id);
        this._settingsSignals = [];
        this._settings = settings ?? null;
        if (!settings)
            return;
        for (const key of ['blur', 'override-background']) {
            const id = settings.connect(`changed::${key}`, () => {
                // Guards take effect immediately, before any asynchronous rebuild.
                this._sync();
                this._settle();
            });
            this._settingsSignals.push([settings, id]);
        }
    }

    _queue() {
        if (!this._enabled || this._queueId)
            return;
        this._queueId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._queueId = 0;
            this._sync();
            return GLib.SOURCE_REMOVE;
        });
    }

    _settle() {
        if (this._settleId)
            GLib.source_remove(this._settleId);
        // A bounded follow-up handles BMS's idle reset and extension load order.
        // This is not a permanent polling timer.
        this._settleId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this._settleId = 0;
            this._sync(true);
            return GLib.SOURCE_REMOVE;
        });
    }

    _sync(notify = false) {
        if (!this._enabled)
            return;
        try {
            if (!this._ownSettings.get_boolean('popup-backgrounds-enabled')) {
                this._policy.clear();
                this._bindSettings(null);
                this._source?.destroy(MessageTray.NotificationDestroyedReason.SOURCE_CLOSED);
                this._source = null;
                this._lastWarning = null;
                return;
            }
            const info = Main.extensionManager.lookup(BMS_UUID);
            const state = dependency(info);
            this._bindSettings(state.settings);
            if (state.reason !== 'active') {
                this._policy.clear();
                if (notify && MESSAGES[state.reason])
                    this._warn(state.reason, info?.stateObj);
                return;
            }
            this._policy.apply(state.component.surfaces, this._overview);
            this._policy.setLightStyle(this._scheme === 'light');
            this._lastWarning = null;
            this._source?.destroy(MessageTray.NotificationDestroyedReason.SOURCE_CLOSED);
            this._source = null;
        } catch (error) {
            this._policy.clear();
            console.error(`${this.metadata.name}: ${error.message}`);
            if (notify)
                this._warn('unsupported', null);
        }
    }

    _warn(reason, bms) {
        if (this._lastWarning === reason)
            return;
        this._lastWarning = reason;
        this._source?.destroy(MessageTray.NotificationDestroyedReason.SOURCE_CLOSED);
        const source = new MessageTray.Source({
            title: this.metadata.name,
            iconName: 'preferences-desktop-appearance-symbolic',
        });
        this._source = source;
        source.connect('destroy', () => {
            if (this._source === source)
                this._source = null;
        });
        Main.messageTray.add(source);
        const [title, body] = MESSAGES[reason];
        const notification = new MessageTray.Notification({source, title, body});
        if (typeof bms?.openPreferences === 'function') {
            notification.addAction('Open Blur my Shell preferences', () => {
                try {
                    bms.openPreferences();
                } catch (error) {
                    console.error(`${this.metadata.name}: ${error.message}`);
                }
            });
        }
        source.addNotification(notification);
    }

    disable() {
        this._enabled = false;
        for (const id of [this._queueId, this._settleId]) {
            if (id)
                GLib.source_remove(id);
        }
        this._queueId = this._settleId = 0;
        for (const [object, id] of this._signals ?? [])
            object.disconnect(id);
        this._signals = [];
        this._bindSettings(null);
        this._policy?.clear();
        this._policy = null;
        this._source?.destroy(MessageTray.NotificationDestroyedReason.SOURCE_CLOSED);
        this._source = null;
        this._lastWarning = null;
        this._ownSettings = this._appearance = null;
    }
}
