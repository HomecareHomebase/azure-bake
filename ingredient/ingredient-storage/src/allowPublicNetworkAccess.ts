import { PUBLIC_NETWORK_ACCESS_EXCEPTION_TAG } from "./constants";

const STORAGE_ACCOUNT_RESOURCE_TYPE = "Microsoft.Storage/storageAccounts";

/**
 * Normalize a raw recipe `allowPublicNetworkAccess` value to a strict boolean at the
 * ingredient boundary. Accepts real booleans and the case-insensitive, whitespace-
 * trimmed strings "true"/"false" (Bake variables surface booleans as strings).
 * Any other value is rejected with an actionable error that names the offending
 * value, since silently defaulting could relax network access unintentionally.
 */
export function normalizeAllowPublicNetworkAccess(raw: unknown): boolean {
    if (raw === true || raw === false) { return raw; }
    if (typeof raw === "string") {
        const v = raw.trim().toLowerCase();
        if (v === "true") { return true; }
        if (v === "false") { return false; }
    }
    throw new Error(
        `Invalid allowPublicNetworkAccess value '${String(raw)}'. Expected boolean true or false.`
    );
}

/**
 * Apply the `allowPublicNetworkAccess` decision to an ARM storage template.
 *
 * PASS 1 IS TAG-ONLY: the `publicNetworkAccess` property is NEVER written for any
 * value. Setting it early would sever connectivity before the NetOps private-DNS
 * enabler (Feature 701425) exists; the property is wired later in Feature 698027.
 *
 * - Omitted (`undefined`/`null`): returns the SAME template reference untouched.
 * - `false`: returns the SAME template reference untouched (no tag, no property).
 * - `true`: deep-clones the template and merges the public-network exception tag
 *   alongside any existing tags (dropping none). No property is written.
 *
 * For the `true` case the template is deep-cloned before mutation, so the shared
 * imported module is never modified. The storage account is located by resource type
 * rather than array index so non-storage resources are left untouched.
 */
export function applyAllowPublicNetworkAccess(template: any, raw: unknown): any {
    if (raw === undefined || raw === null) {
        return template; // omit-when-unset: return the SAME reference untouched
    }
    const enabled = normalizeAllowPublicNetworkAccess(raw);
    if (!enabled) {
        return template; // Pass 1 stub: false stamps no tag and writes no property
    }
    const clone = JSON.parse(JSON.stringify(template));
    const account = (clone.resources as any[]).find(r => r.type === STORAGE_ACCOUNT_RESOURCE_TYPE);
    if (!account) {
        throw new Error(`Storage account resource ('${STORAGE_ACCOUNT_RESOURCE_TYPE}') not found in template.`);
    }
    account.tags = {
        ...(account.tags || {}),
        [PUBLIC_NETWORK_ACCESS_EXCEPTION_TAG.name]: PUBLIC_NETWORK_ACCESS_EXCEPTION_TAG.value
    };
    return clone;
}
