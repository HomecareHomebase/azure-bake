## Changelogs
* [@azbake/ingredient-container-registry](./CHANGELOG.md)

## Overview

The Container Registry ingredient is a plugin for Bake.  When included in a recipe this will create an **Azure Container Registry** for *Docker* images.

## Usage

This typically would be included as a one time deploy of a platform level resource. Re-deployment would likely be for changing of settings or possibly setting up a new Container Registry.

### Recipe
```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-container-registry@~0"
parallelRegions: false
resourceGroup: true
recipe:
  mypkg-storage:
    properties:
      type: "@azbake/ingredient-container-registry"
      source: ""
      parameters:
        registryName: MyContainerRegistry
```


| property|required|description|
|---------|--------|-----------|
| registryName | yes | Name for the Container Registry Resource |
| adminUserEnabled | no | Uses a *boolean* value to allow login via the resource name and an administrator key. Default is `false` |
| registrySku | no | Selects `Basic`, `Standard`, or `Premium` tiers for container registry. Default is *Basic*. See [documentation](https://azure.microsoft.com/en-us/pricing/details/container-registry/) |
| registryLocation| no |The location for this resource. Default is the parent resource group geographic location |

*** Please note that the only value required for creation of this resource is the `registryName`

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``acr`` class

|function|description|
|--------|-----------|
|create_resource_name()| Returns the name created for the container registry profile when deployed.|

### Function Details

#### create_resource_name()
Gets the name create for the traffic manager profile deployed.

```yaml
...
parameters:
    registryName: "[acr.create_resource_name()]"
...
```

#### Returns
string
