## Changelogs

* [@azbake/ingredient-service-bus-namespace](./CHANGELOG.md)

## Overview

The Service Bus Namespace ingredient is a plugin for bake. When included in a recipe, this will create a [Service Bus Namespace](https://docs.microsoft.com/en-us/azure/templates/microsoft.datafactory/2018-06-01/factories).

## Usage

```yaml
name: datafactoryv2test
shortName: logicalsqlserver
version: 1.0.0
ingredients:
  - "@azbake/ingredient-datafactoryv2@0~"
resourceGroup: true
rgOverride: HCHB_DataAdmins_DataWarehouse_Dev
parallelRegions: false
variables:
  name : "datafactoryv2test003"
  location : "centralus"
recipe:
  datafactory:
    properties:
      type: "@azbake/ingredient-datafactoryv2"
      parameters:
        name : "[coreutils.variable('name')]"
        location : "[coreutils.variable('location')]"
```

| property | required | description |
| -------- | -------- | ----------- |
| name | yes | The name for the Data Factory |
| location | no | The location of the Data Factory |


## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``datafactory`` class

| function | description |
| `create_resource_name()` | Returns the name created for the Service Bus Namespace when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the App Service Plan when deployed.

```yaml
...
parameters:
    planName: "[datafactory.create_resource_name()]"
...
```

##### Returns

string