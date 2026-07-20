import { applyAllowBlobPublicAccess } from "./allowBlobPublicAccess";
import { applyAllowPublicNetworkAccess } from "./allowPublicNetworkAccess";

/**
 * A storage-account option that is applied to the ARM template **directly** (as a tag
 * and/or property mutation) rather than passed through as an ARM template parameter.
 *
 * Each option owns:
 *  - `param`: the recipe parameter key it reads. Because the ARM template does not
 *    declare this key, it must be stripped from the ARM params before deployment
 *    (otherwise ARM rejects it as an undefined parameter).
 *  - `apply`: a pure `(template, raw) => template` transform. It returns the SAME
 *    template reference when the option is a no-op and deep-clones before mutating,
 *    so transforms compose cleanly and never mutate the shared imported templates.
 *
 * To add a future template-applied option, implement its `apply(template, raw)` and
 * add a single entry to this registry — no changes to the deploy call sites required.
 */
export const STORAGE_TEMPLATE_OPTIONS: ReadonlyArray<{
    param: string;
    apply: (template: any, raw: unknown) => any;
}> = [
    { param: "allowBlobPublicAccess", apply: applyAllowBlobPublicAccess },
    { param: "allowPublicNetworkAccess", apply: applyAllowPublicNetworkAccess },
];

/**
 * Capture each template-applied option's raw value from the ARM `params` map and
 * remove it from that map (mutating `params`), since these are applied to the template
 * directly and are not ARM template parameters. Returns the captured raw values keyed
 * by parameter name; omitted options are absent from the map.
 */
export function extractStorageTemplateOptions(params: any): Map<string, unknown> {
    const values = new Map<string, unknown>();
    for (const { param } of STORAGE_TEMPLATE_OPTIONS) {
        const raw = params[param] === undefined ? undefined : params[param].value;
        delete params[param];
        if (raw !== undefined) {
            values.set(param, raw);
        }
    }
    return values;
}

/**
 * Apply every captured option to `template` in registry order, threading the result so
 * options compose (e.g. both exception tags can co-exist on one account). Options not
 * present in `values` are passed `undefined` and are expected to be no-ops.
 */
export function applyStorageTemplateOptions(template: any, values: Map<string, unknown>): any {
    return STORAGE_TEMPLATE_OPTIONS.reduce(
        (t, { param, apply }) => apply(t, values.get(param)),
        template
    );
}
