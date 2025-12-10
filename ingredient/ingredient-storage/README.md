## Changelogs
* [@azbake/ingredient-storage](./CHANGELOG.md)

## Overview

The Storage ingredient is a plugin for Bake.  When included in a recipe this will create a standard storage account. Whether services `blob`, `file`, `disk`, `queue`, or `table` storage are mounted on this resource is not defined in the template, only the logical construct is created.

## Usage

This typically would be included as a dependent resource in a recipe. It is possible to setup a **stand alone** instance, but would not be a typical inclusion.  Metrics and diagnostic logs are recorded to Storage Analytics is enabled by default.

### Recipe
```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-storage@~0"
parallelRegions: false
resourceGroup: true
variables:
  #"true" or "false" strings.  Defaults to "true" if unspecified.
  blobDiagnosticHourlyMetricsEnabled: "true"
  #Number of days to retain hourly metrics
  blobDiagnosticHourlyMetricsRetentionDays: 12
  #"true" or "false" strings.  Defaults to "true" if unspecified.
  blobDiagnosticMinuteMetricsEnabled: "false"
  #Number of days to retain minute metrics
  blobDiagnosticMinuteMetricsRetentionDays: 10    
    #"true" or "false" strings.  Defaults to "true" if unspecified.
  blobDiagnosticLoggingEnabled: "true"
  #Number of days to retain minute metrics
  blobDiagnosticLoggingRetentionDays: 10    
recipe:
  mypkg-storage:
    properties:
      type: "@azbake/ingredient-storage"
      source: ""
      parameters:
        storageAccountName: "[storage.create_resource_name()]"
```


| parameter |required|default|description|
|---------|--------|-----------|-----------|
| storageAccountName | yes | | Name for the storage account resource |
| storageKind | no | `StorageV2` | Sets the storage account kind |
| storageTier | no | `Standard` | Sets the pricing tier for the storage account |
| location | no | Parent resource group geographic location | The location for this resource |
| storageAccountType | no | | The type for the storage account See [documentation](https://docs.microsoft.com/en-us/azure/templates/microsoft.storage/2018-11-01/storageaccounts) |
| storageAccessTier | no | | Selects **Hot** or *Cold* tiers for the storage account. See [documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-storage-tiers) |
| container | yes (when `source` is populated) |  | Container to upload the specific `source` to. Only used when `source` is specified. |
| uploadPath | yes (when `source` is populated) |  | Path within the specified container to upload the `source` to. Only used when `source` is specified. |
| deploy | no | true | Flag to determine whether or not to deploy the service account. Useful for skipping deployment when just adding context to a container via `source` |
| unzip | no | false | Flag to determine whether or not to unzip and upload if a zip file is encountered in the specified path. |
| rgOverride | no | | Specifics a resource group override for the storage account if different from the main resource group of the bake recipe. |

| variable |required|default|description|
|---------|--------|-----------|-----------|
| blobDiagnosticHourlyMetricsEnabled | no | "true" | Enables recording of hourly metrics to Storage Analytics. Currently accepts "true" / "false" as strings only. |
| blobDiagnosticHourlyMetricsRetentionDays | no | 10 | Data retention of hourly metrics in Storage Analytics. |
| blobDiagnosticMinuteMetricsEnabled | no | "true" | Enables recording of minute metrics to Storage Analytics. Currently accepts "true" / "false" as strings only.  |
| blobDiagnosticMinuteMetricsRetentionDays | no | 10 | Data retention of minute metrics in Storage Analytics |
| blobDiagnosticLoggingEnabled | no | "true" | Enables recording of diagnostic logs to Storage Analytics.   Currently accepts "true" / "false" as strings only. |
| blobDiagnosticLoggingRetentionDays | 10 | "true" | Data retention of diagnostic logs in Storage Analytics |

*** Please note that the only value required for creation of this resource is the `storageAccountName`

## Uploading Files to Blob Storage

Files can be uploaded to a blob container during deployment by specifying the `source` property within the recipe. The source property supports pointing to a direct file via `file:///` syntax or pointing to a directory using relative pathing.

NOTE: only blob storage is supported at this time.

```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-storage@~0"
parallelRegions: false
resourceGroup: false
recipe:
  mypkg-storage:
    properties:
      type: "@azbake/ingredient-storage"
      source: "file:///./deploy/deploy.zip" # "./deploy"
      parameters:
        storageAccountName: "[storage.create_resource_name()]"
        container: myContainer
        uploadPath: mypkg/__build_buildNumber__
        deploy: false
        unzip: true
```

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``storage`` class

|function|description|
|--------|-----------|
|create_resource_name()| Returns the name created for the traffic manager profile when deployed.|
|add_delete_policy(name, enabled, daysAfter)| Creates a global delete policy rule for all blockBlobs.|
|add_delete_policy_for_prefix(name, enabled, daysAfter, prefixMatch, blobTypes?)| Creates a delete policy rule with container/path prefix filters.|
|add_delete_policy_advanced(name, enabled, daysAfter, options)| Creates a delete policy rule with advanced filtering (prefix + blob index tags).|
|create_policy(...rules)| Creates a management policy schema from one or more rules.|
|get_container(account, container, accessLevel?, policy?)| Gets or creates a container and optionally applies a management policy.|
|get_storageaccount(resourceGroup, name)| Gets storage account details including endpoints and key.|
|get_primary_key(name, rg?)| Gets the primary access key for a storage account.|
|get_secondary_key(name, rg?)| Gets the secondary access key for a storage account.|
|get_primary_connectionstring(name, rg?)| Gets the primary connection string for a storage account.|
|get_secondary_connectionstring(name, rg?)| Gets the secondary connection string for a storage account.|

### Function Details

#### create_resource_name()
Gets the name create for the traffic manager profile deployed.

```yaml
...
parameters:
    storageAccountName: "[storage.create_resource_name()]"
...
```

#### Returns
string

### Lifecycle Management Policies

The storage ingredient supports Azure Blob Storage lifecycle management policies for automatic blob deletion based on age. You can apply policies globally, per container, or even per path prefix.

#### add_delete_policy(name, enabled, daysAfter)
Creates a global delete policy rule that applies to all blockBlobs in the storage account.

| Parameter | Type | Description |
|-----------|------|-------------|
| name | string | The name of the policy rule (unique within the policy) |
| enabled | boolean | Whether the rule is enabled |
| daysAfter | number | Days after last modification to delete the blob |

#### add_delete_policy_for_prefix(name, enabled, daysAfter, prefixMatch, blobTypes?)
Creates a delete policy rule with container/path prefix filters. This allows setting different TTL policies per container or per path prefix within containers.

| Parameter | Type | Description |
|-----------|------|-------------|
| name | string | The name of the policy rule (unique within the policy) |
| enabled | boolean | Whether the rule is enabled |
| daysAfter | number | Days after last modification to delete the blob |
| prefixMatch | string[] | Array of prefix strings (e.g., `["logs/", "temp/archive/"]`). Each prefix must start with a container name. Up to 10 prefixes per rule. |
| blobTypes | string[] | Optional. Blob types to apply to. Defaults to `["blockBlob"]`. Valid: `"blockBlob"`, `"appendBlob"` |

**Example: Different TTL per container**
```typescript
// Delete blobs in 'logs' container after 30 days
const logsRule = storage.add_delete_policy_for_prefix("delete-logs", true, 30, ["logs/"]);

// Delete blobs in 'temp' container after 7 days  
const tempRule = storage.add_delete_policy_for_prefix("delete-temp", true, 7, ["temp/"]);

// Delete blobs in 'archive' container after 365 days
const archiveRule = storage.add_delete_policy_for_prefix("delete-archive", true, 365, ["archive/"]);

// Create combined policy
const policy = storage.create_policy(logsRule, tempRule, archiveRule);
```

**Example: Path-level TTL within a container**
```typescript
// Delete blobs in 'data/temp/' after 7 days, 'data/cache/' after 14 days
const tempRule = storage.add_delete_policy_for_prefix("delete-data-temp", true, 7, ["data/temp/"]);
const cacheRule = storage.add_delete_policy_for_prefix("delete-data-cache", true, 14, ["data/cache/"]);

const policy = storage.create_policy(tempRule, cacheRule);
```

#### add_delete_policy_advanced(name, enabled, daysAfter, options)
Creates a delete policy rule with advanced filtering options including prefix and blob index tags.

| Parameter | Type | Description |
|-----------|------|-------------|
| name | string | The name of the policy rule |
| enabled | boolean | Whether the rule is enabled |
| daysAfter | number | Days after last modification to delete the blob |
| options | object | Advanced filtering options |
| options.prefixMatch | string[] | Optional. Array of prefix strings |
| options.blobIndexMatch | object[] | Optional. Array of blob index tag conditions `{ name, op, value }` |
| options.blobTypes | string[] | Optional. Blob types. Defaults to `["blockBlob"]` |

**Example: Filter by blob index tags**
```typescript
// Delete blobs tagged as "archived" in 'reports' container after 14 days
const rule = storage.add_delete_policy_advanced("delete-archived-reports", true, 14, {
  prefixMatch: ["reports/"],
  blobIndexMatch: [{ name: "status", op: "==", value: "archived" }]
});
```

#### create_policy(...rules)
Creates a management policy schema from one or more policy rules.

| Parameter | Type | Description |
|-----------|------|-------------|
| rules | ManagementPolicyRule[] | One or more policy rules created by add_delete_policy functions |

#### get_container(account, container, accessLevel?, policy?)
Gets or creates a container and optionally applies a management policy. When a policy is provided, it automatically scopes the policy rules to the specified container by adding prefix filters.

| Parameter | Type | Description |
|-----------|------|-------------|
| account | BakeStorageAccount | Storage account object from get_storageaccount() |
| container | string | Container name |
| accessLevel | string | Optional. Access level: `"container"`, `"blob"`, or `undefined` |
| policy | ManagementPolicySchema | Optional. Policy to apply (rules will be scoped to this container) |
