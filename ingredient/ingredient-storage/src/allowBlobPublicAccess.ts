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
 * - Omitted (`undefined`/`null`): returns a deep clone with `properties.allowBlobPublicAccess = false`
 *   (secure-by-default baseline flip).
 * - `false`: writes `properties.allowBlobPublicAccess = false`; stamps no exception tag.
 * - `true`: writes `properties.allowBlobPublicAccess = true` and merges the
 *   anonymous-blob exception tag alongside any existing tags (dropping none).
 *
 * All explicit values (including omitted) result in a deep-cloned template, preventing
 * mutation of the shared imported module. The storage account is located by resource type
 * rather than array index so non-storage resources are left untouched.
 */
export function applyAllowBlobPublicAccess(template: any, raw: unknown): any {
    // Baseline flip (Pass-2): omitted (undefined/null) now defaults to false (secure default)
    // instead of "property not written" (Pass-1 behavior). This enforces secure-by-default
    // on new and redeployed accounts unless an explicit exception (true + tag) is set.
    const enabled = raw === undefined || raw === null ? false : normalizeAllowBlobPublicAccess(raw);
    
    // Always deep-clone the template to prevent mutation of the shared imported module.
    // This ensures each call is isolated and idempotent.
    const clone = JSON.parse(JSON.stringify(template));
    
    // Locate the storage account resource by type (not array index) to handle templates
    // with multiple resource types safely.
    const account = (clone.resources as any[]).find(r => r.type === STORAGE_ACCOUNT_RESOURCE_TYPE);
    if (!account) {
        throw new Error(`Storage account resource ('${STORAGE_ACCOUNT_RESOURCE_TYPE}') not found in template.`);
    }
    
    // Write the allowBlobPublicAccess property to storage account.
    // - omitted/false → properties.allowBlobPublicAccess = false (no anonymous access)
    // - true         → properties.allowBlobPublicAccess = true (anonymous access enabled)
    account.properties = account.properties || {};
    account.properties.allowBlobPublicAccess = enabled;
    
    // Apply exception tag ONLY when explicitly true (anonymous access is being granted).
    // The tag signals this account is an approved exception to the secure-by-default policy.
    // For omitted/false cases, no tag is applied.
    if (enabled) {
        // Merge the anonymous-blob exception tag with any existing tags (spread operator preserves all).
        // This ensures no existing tags are dropped when the exception tag is added.
        account.tags = {
            ...(account.tags || {}),
            [ANON_BLOB_ACCESS_EXCEPTION_TAG.name]: ANON_BLOB_ACCESS_EXCEPTION_TAG.value
        };
    }
    return clone;
}
