## Changelogs

* [@azbake/ingredient-app-service-plan]

## Overview

The App Service Plan ingredient is a plugin for bake. When included in a recipe, this will create an [App Service Plan](https://docs.microsoft.com/en-us/azure/app-service/overview-hosting-plans).


## Usage

```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-app-service-plan@~0"
resourceGroup: true
recipe:
  mypkg-deploy:
    properties:
      type: "@azbake/ingredient-app-service-plan"
      source: ""
      parameters:
        appServicePlanName: "AppServicePlanName"
        kind: "linux"
```

| property | required | description |
| -------- | -------- | ----------- |
| appServicePlanName | yes | The name for the App Service Plan |
| skuName | no (default `B1`) | | Sets pricing tier. |
| skuCapacity | no (default `1`) | Sets the instance count. |
| location | no | Sets the location. Defaults to the parent resource group location. |
| kind | no (default `linux`) | Sets the kind of service plan. `linux` for linux, `windows` for windows. |

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``appserviceplan`` class

| function | description |
| `create_resource_name()` | Returns the name created for the App Service Plan when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the App Service Plan when deployed.

```yaml
...
parameters:
    planName: "[appserviceplan.create_resource_name()]"
...
```

##### Returns

string