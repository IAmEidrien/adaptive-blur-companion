// SPDX-License-Identifier: GPL-3.0-only
// Pure selection policy shared with tests. No rendering or pipeline-definition edits.
export function resolveScheme(value) {
    return value === 'prefer-dark' ? 'dark' : 'light';
}

export class PipelineController {
    constructor(store, undo) {
        this.store = store;
        this.undo = undo;
    }

    apply(mode, assignments) {
        if (!['dark', 'light'].includes(mode))
            throw new Error('Unknown appearance');
        const targets = {};
        for (const [component, pair] of Object.entries(assignments)) {
            if (pair[mode]) targets[component] = pair[mode];
        }
        return this._change(targets, false);
    }

    revert() {
        const saved = this.undo.read();
        if (!Object.keys(saved).length)
            return {changed: 0, reverted: false};
        return this._change(saved, true);
    }

    _change(targets, reverting) {
        const catalog = this.store.catalog();
        const components = new Set(this.store.components());
        const before = {};
        for (const [component, pipeline] of Object.entries(targets)) {
            if (!components.has(component))
                throw new Error(`Blur my Shell component is unavailable: ${component}`);
            if (!Object.hasOwn(catalog, pipeline))
                throw new Error(`Pipeline is missing: ${pipeline}. Choose another pipeline.`);
            const current = this.store.read(component);
            if (current === pipeline) continue;
            if (!this.store.writable(component))
                throw new Error(`Pipeline selection is read-only: ${component}`);
            before[component] = current;
        }
        const changed = Object.keys(before);
        if (!changed.length) {
            if (reverting && !this.undo.write({}))
                throw new Error('Could not clear the revert snapshot');
            return {changed: 0, reverted: reverting};
        }
        const written = [];
        try {
            for (const component of changed) {
                if (!this.store.write(component, targets[component]))
                    throw new Error(`Could not apply pipeline: ${component}`);
                written.push(component);
            }
            if (!this.undo.write(reverting ? {} : before))
                throw new Error('Could not save the revert snapshot');
        } catch (error) {
            const failed = [];
            for (const component of written.reverse()) {
                try {
                    if (!this.store.write(component, before[component])) failed.push(component);
                } catch { failed.push(component); }
            }
            if (failed.length)
                throw new Error(`${error.message}; could not restore: ${failed.join(', ')}`);
            throw error;
        }
        return {changed: changed.length, reverted: reverting};
    }
}
