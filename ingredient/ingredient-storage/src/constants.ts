/**
 * Anonymous-blob exception tag stamped on a storage account only when
 * allowBlobPublicAccess is explicitly enabled. Recipe authors never type the raw string.
 */
export const ANON_BLOB_ACCESS_EXCEPTION_TAG = {
    name: "allow-anonymous-blob-access",
    value: "true"
} as const;
