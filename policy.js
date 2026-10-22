// SPDX-License-Identifier: GPL-3.0-only
export const BMS_UUID = 'blur-my-shell@aunetx';
export const ACTIVE_CLASS = 'opb-active';
export const TRANSPARENT_CLASS = 'opb-transparent';
export const LIGHT_CLASS = 'abc-light';

// Read-only adapter for Blur my Shell's modern popup component. This is an
// internal API, deliberately shape-checked; never monkey-patch its methods.
export function dependency(info) {
    if (info?.state !== 1) // ExtensionState.ENABLED on GNOME 46
        return {reason: 'missing'};
    const component = info.stateObj?._popup;
    const settings = info.stateObj?._settings?.popup?.settings;
    if (!component || !(component.surfaces instanceof Map) ||
        typeof settings?.get_boolean !== 'function')
        return {reason: 'unsupported'};
    try {
        if (!settings.get_boolean('blur'))
            return {reason: 'blur-off', settings};
        if (settings.get_boolean('override-background'))
            return {reason: 'conflict', settings};
        if (!component.enabled)
            return {reason: 'waiting', settings};
    } catch {
        return {reason: 'unsupported'};
    }
    return {reason: 'active', component, settings};
}

export function inQuickSubmenu(actor) {
    for (let current = actor; current; current = current.get_parent?.()) {
        if (current.has_style_class_name?.('quick-toggle-menu'))
            return true;
    }
    return false;
}

// Only add/remove our own class. No inline style snapshot can overwrite a
// concurrently changed theme, another extension, or Blur my Shell's geometry.
export class BackgroundPolicy {
    constructor(root) {
        this.root = root;
        this.targets = new Map();
    }

    apply(surfaces, overview) {
        this.root.add_style_class_name(ACTIVE_CLASS);
        const wanted = new Set();
        for (const [target, surface] of surfaces) {
            if (!surface?.actor || !target.get_stage?.() ||
                typeof target.add_style_class_name !== 'function')
                continue;
            wanted.add(target);
            if (!this.targets.has(target)) {
                const record = {owned: false, destroy: 0};
                record.destroy = target.connect('destroy', () => this.targets.delete(target));
                this.targets.set(target, record);
            }
            const record = this.targets.get(target);
            const transparent = overview && !inQuickSubmenu(target);
            if (transparent && !target.has_style_class_name(TRANSPARENT_CLASS)) {
                target.add_style_class_name(TRANSPARENT_CLASS);
                record.owned = true;
            } else if (!transparent && record.owned) {
                target.remove_style_class_name(TRANSPARENT_CLASS);
                record.owned = false;
            }
        }
        for (const target of this.targets.keys()) {
            if (!wanted.has(target))
                this.release(target);
        }
    }

    setLightStyle(light) {
        if (light) this.root.add_style_class_name(LIGHT_CLASS);
        else this.root.remove_style_class_name(LIGHT_CLASS);
    }

    release(target) {
        const record = this.targets.get(target);
        if (!record)
            return;
        this.targets.delete(target);
        if (record.owned)
            target.remove_style_class_name(TRANSPARENT_CLASS);
        target.disconnect(record.destroy);
    }

    clear() {
        for (const target of this.targets.keys())
            this.release(target);
        this.root.remove_style_class_name(ACTIVE_CLASS);
        this.root.remove_style_class_name(LIGHT_CLASS);
    }
}
