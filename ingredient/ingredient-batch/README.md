## Changelogs

* [@azbake/ingredient-batch](./CHANGELOG.md)

## Overview

The Batch ingredient is a plugin for bake. When included in a recipe, this will create a [Batch Account](https://docs.microsoft.com/en-us/azure/batch/accounts).

## Usage

```yaml
name: batch-test
shortName: btest
version: 1.0.0
ingredients:
  - "@azbake/ingredient-batch@0.0.1"
  - "@azbake/ingredient-event-hub-namespace"
resourceGroup: true
rgOverride: "test-rg"
parallelRegions: false
recipe:
  batch:
    properties:
      type: "@azbake/ingredient-batch"
      parameters:
        batchAccountName: "[batchutil.create_resourcename()]"
```

| property | required | description |
| -------- | -------- | ----------- |
| batchAccountName | yes | The name of the batch account |

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``BatchUtils`` class

| function | description |
| `create_resource_name()` | Returns the name created for the Batch Account when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the Batch Account when deployed.

```yaml
...
parameters:
    planName: "[BatchUtils.create_resource_name()]"
...
```

##### Returns

string