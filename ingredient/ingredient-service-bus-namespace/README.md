## Changelogs

* [@azbake/ingredient-service-bus-namespace](./CHANGELOG.md)

## Overview

The Service Bus Namespace ingredient is a plugin for bake. When included in a recipe, this will create a [Service Bus Namespace](https://docs.microsoft.com/en-us/azure/service-bus-messaging/service-bus-messaging-overview).

## Usage

```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-service-bus-namespace@~0"
resourceGroup: true
recipe:
  service-bus-namespace:
    properties:
      type: "@azbake/ingredient-service-bus-namespace"
      parameters:
        name: "myservicebusprimary"
        secondaryName: "myservicebussecondary"
        skuName: "Premium"
        location: "US Central"
        secondaryLocation: "East US 2"
        aliasName: "myservicebus"
        capacity: "1"
```

| property | required | description |
| -------- | -------- | ----------- |
| name | yes | The name for the singular/primary Service Bus Namespace |
| secondaryName | no | The name of the secondary Service Bus namespace |
| skuName | no (default `Basic`) | The messaging messaging tier. |
| location | no | The location of the singular/primary namespace. Defaults to the parent resource group location. |
| secondaryLocation | no | The location of the secondary namespace. |
| aliasName | no | The name of the Geo-Recovery configuration alias  |
| capacity | no | The specified messaging units for the tier. |

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``servicebusnamespace`` class

| function | description |
| `create_resource_name()` | Returns the name created for the Service Bus Namespace when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the App Service Plan when deployed.

```yaml
...
parameters:
    planName: "[servicebusnamespace.create_resource_name()]"
...
```

##### Returns

string