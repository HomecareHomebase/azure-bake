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
  mypkg-service-bus-namespace:
    properties:
      type: "@azbake/ingredient-service-bus-namespace"
      source: ""
      parameters:
        serviceBusNamespaceName: "ServiceBusNamespaceName"
```

| property | required | description |
| -------- | -------- | ----------- |
| serviceBusNamespaceName | yes | The name for the Service Bus Namespace |
| skuName | no (default `Standard`) | Sets messaging tier. |
| location | no | Sets the location. Defaults to the parent resource group location. |

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