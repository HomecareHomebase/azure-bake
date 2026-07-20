/**
 * Anonymous-blob exception-tag contract.
 *
 * The `hchb-policy-exempt-anon-blob` tag key/value is owned by Feature 704176
 * (the Deny-policy governance work) and merely consumed here. It is stamped on a
 * storage account only when `allowBlobPublicAccess` is explicitly enabled, marking
 * that account as a sanctioned exception to the anonymous-blob Deny policy.
 *
 * The governed `hchb-` prefix keeps guardrail tags groupable and collision-safe
 * against app/Bake tags.
 *
 * Recipe authors never type the raw tag string; it is applied exclusively through
 * this exported constant so the key/value stay in lock-step with the owning feature.
 */
export const ANON_BLOB_ACCESS_EXCEPTION_TAG = {
    name: "hchb-policy-exempt-anon-blob",
    value: "true"
} as const;

/**
 * Public-network-access exception-tag contract.
 *
 * The `hchb-policy-exempt-public-network` tag key/value is owned by Feature 701486
 * (the network-access Deny-policy governance work) and merely consumed here. It is
 * stamped on a storage account only when `allowPublicNetworkAccess` is explicitly
 * enabled, marking that account as a sanctioned exception to the public-network-access
 * Deny policy.
 *
 * The governed `hchb-` prefix keeps guardrail tags groupable and collision-safe
 * against app/Bake tags.
 *
 * Pass 1 is tag-only: the `publicNetworkAccess` property itself is deferred to the
 * enforcement work (Feature 698027) behind the NetOps private-DNS gate (Feature 701425).
 *
 * Recipe authors never type the raw tag string; it is applied exclusively through
 * this exported constant so the key/value stay in lock-step with the owning feature.
 */
export const PUBLIC_NETWORK_ACCESS_EXCEPTION_TAG = {
    name: "hchb-policy-exempt-public-network",
    value: "true"
} as const;
