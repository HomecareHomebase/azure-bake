## Changelogs
* [@azbake/ingredient-storage](./CHANGELOG.md)

## Overview

The Storage ingredient is a plugin for Bake.  When included in a recipe this will create a standard storage account. Whether services `blob`, `file`, `disk`, `queue`, or `table` storage are mounted on this resource is not defined in the template, only the logical construct is created.

## Usage

This typically would be included as a dependent resource in a recipe. It is possible to setup a **stand alone** instance, but would not be a typical inclusion.

### Recipe
```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-storage@~0"
parallelRegions: false
resourceGroup: true
recipe:
  mypkg-storage:
    properties:
      type: "@azbake/ingredient-storage"
      source: ""
      parameters:
        storageAccountName: "[storage.create_resource_name()]"
```


| property|required|description|
|---------|--------|-----------|
| storageAccountName | yes | Name for the storage account resource |
| storageKind | no | Sets the storage account kind. Default is `StorageV2` |
| storageTier | no | Sets the pricing tier for the storage account. Default is `Standard` |
| location | no |The location for this resource. Default is the parent resource group geographic location |
| storageAccountType | no | The type for the storage account. See [documentation](https://docs.microsoft.com/en-us/azure/templates/microsoft.storage/2018-11-01/storageaccounts) |
| storageAccessTier | no | Selects **Hot** or *Cold* tiers for the storage account. See [documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/storage-blob-storage-tiers) |

*** Please note that the only value required for creation of this resource is the `storageAccountName`

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
