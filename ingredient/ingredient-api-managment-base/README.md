## Changelogs

* [@azbake/ingredient-api-management-api](./CHANGELOG.md)

## Overview

The Azure API Management API is a plugin for bake. When included in a recipe, this will create an [Windows API Management API](https://docs.microsoft.com/en-us/azure/api-management/api-management-key-concepts)
## Usage

```yaml
name: apim-api-test
shortName: apitest
version: 1.0.0
ingredients:
  - "@azbake/ingredient-api-management-base@0~"
resourceGroup: true
rgOverride: test
parallelRegions: false
recipe:
  linux-test:
    properties:
      type: "@azbake/ingredient-api-management-api"
      parameters:
        apimInstance: "testapim"
        apiName: "testapi"
        backend: "testbackend"
```

##Properties
Set: 
| property | value |
| osType | windows |

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``apim-api`` class

| function | description |
| `create_resource_name()` | Returns the name created for the Service Bus Namespace when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the App Service Plan when deployed.

```yaml
...
parameters:
    planName: "[apim-api.create_resource_name()]"
...
```

##### Returns

string