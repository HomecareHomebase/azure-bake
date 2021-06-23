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
