import { ANON_BLOB_ACCESS_EXCEPTION_TAG } from "./constants";

const STORAGE_ACCOUNT_RESOURCE_TYPE = "Microsoft.Storage/storageAccounts";

/**
 * Normalize a raw recipe `allowBlobPublicAccess` value to a strict boolean at the
 * ingredient boundary. Accepts real booleans and the case-insensitive, whitespace-
 * trimmed strings "true"/"false" (Bake variables surface booleans as strings).
 * Any other value is rejected with an actionable error that names the offending
 * value, since silently defaulting could relax anonymous-blob access unintentionally.
 */
export function normalizeAllowBlobPublicAccess(raw: unknown): boolean {
    if (raw === true || raw === false) { return raw; }
    if (typeof raw === "string") {
        const v = raw.trim().toLowerCase();
        if (v === "true") { return true; }
        if (v === "false") { return false; }
    }
    throw new Error(
        `Invalid allowBlobPublicAccess value '${String(raw)}'. Expected boolean true or false.`
    );
}

/**
 * Apply the `allowBlobPublicAccess` decision to an ARM storage template.
 *
 * - Omitted (`undefined`/`null`): returns the SAME template reference untouched, so
 *   the property is never emitted and the template stays byte-for-byte identical.
 * - `false`: writes `properties.allowBlobPublicAccess = false`; stamps no exception tag.
 * - `true`: writes `properties.allowBlobPublicAccess = true` and merges the
 *   anonymous-blob exception tag alongside any existing tags (dropping none).
 *
 * For any explicit value the template is deep-cloned before mutation, so the shared
 * imported module is never modified. The storage account is located by resource type
 * rather than array index so non-storage resources are left untouched.
 */
export function applyAllowBlobPublicAccess(template: any, raw: unknown): any {
    if (raw === undefined || raw === null) {
        return template; // omit-when-unset: return the SAME reference untouched (AC1, AC7)
    }
    const enabled = normalizeAllowBlobPublicAccess(raw);
    const clone = JSON.parse(JSON.stringify(template));
    const account = (clone.resources as any[]).find(r => r.type === STORAGE_ACCOUNT_RESOURCE_TYPE);
    if (!account) {
        throw new Error(`Storage account resource ('${STORAGE_ACCOUNT_RESOURCE_TYPE}') not found in template.`);
    }
    account.properties = account.properties || {};
    account.properties.allowBlobPublicAccess = enabled;
    if (enabled) {
        account.tags = {
            ...(account.tags || {}),
            [ANON_BLOB_ACCESS_EXCEPTION_TAG.name]: ANON_BLOB_ACCESS_EXCEPTION_TAG.value
        };
    }
    return clone;
}
