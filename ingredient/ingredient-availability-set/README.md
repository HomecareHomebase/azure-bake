## Changelogs
* [@azbake/ingredient-availability-set](./CHANGELOG.md)

## Overview

The Availability Set ingredient is a plugin for Bake. When included in a recipe, this will create an availability set for redundancy for your application.

## Usage

### Recipe
```yaml
name: My package
shortName: mypkg
version: 1.0.0
ingredients:
  - "@azbake/ingredient-availability-set@~0"
resourceGroup: true
rgOverride: "resourcegroup1"
parallelRegions: false
recipe:
  funcapp:
    properties:
      type: "@azbake/ingredient-availability-set"
      parameters:
        name: "[availutils.create_resource_name()]"
        faultDomains: "2"
        updateDomains: "5"
        sku: "Aligned"
```

| property|required|description|
|---------|--------|-----------|
| name | yes | Name for the availability set resource |
| faultDomains | no | Number of fault domains to use (Default: 2) |
| updateDomains | no | Number of update domains to use (Default 5) |
| sku | no | Use Aligned (managed) or Classic (unmanaged) disks; available values [ Aligned, Classic ] (Default: Aligned) |
| location | no | Sets the location. Defaults to the parent resource group location. |


## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``availutils`` class

|function|description|
|--------|-----------|
|create_resource_name()| Creates a name for the availability set in the format ``<environment_name><region_code>avail<pkg_shortname>``.|

### Function Details

#### create_resource_name()
Creates a name for the availability set in the format ``<environment_name><region_code>avail<pkg_shortname>``

```yaml
...
parameters:
  appName: "[availutils.create_resource_name()]"
...
```
#### Returns
string