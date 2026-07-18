/**
 * Anonymous-blob exception-tag contract.
 *
 * The `allow-anonymous-blob-access` tag key/value is owned by Feature 704176
 * (the Deny-policy governance work) and merely consumed here. It is stamped on a
 * storage account only when `allowBlobPublicAccess` is explicitly enabled, marking
 * that account as a sanctioned exception to the anonymous-blob Deny policy.
 *
 * Recipe authors never type the raw tag string; it is applied exclusively through
 * this exported constant so the key/value stay in lock-step with the owning feature.
 */
export const ANON_BLOB_ACCESS_EXCEPTION_TAG = {
    name: "allow-anonymous-blob-access",
    value: "true"
} as const;

/**
 * Public-network-access exception-tag contract.
 *
 * The `allow-public-network-access` tag key/value is owned by Feature 701486
 * (the network-access Deny-policy governance work) and merely consumed here. It is
 * stamped on a storage account only when `allowPublicNetworkAccess` is explicitly
 * enabled, marking that account as a sanctioned exception to the public-network-access
 * Deny policy.
 *
 * Pass 1 is tag-only: the `publicNetworkAccess` property itself is deferred to the
 * enforcement work (Feature 698027) behind the NetOps private-DNS gate (Feature 701425).
 *
 * Recipe authors never type the raw tag string; it is applied exclusively through
 * this exported constant so the key/value stay in lock-step with the owning feature.
 */
export const PUBLIC_NETWORK_ACCESS_EXCEPTION_TAG = {
    name: "allow-public-network-access",
    value: "true"
} as const;
