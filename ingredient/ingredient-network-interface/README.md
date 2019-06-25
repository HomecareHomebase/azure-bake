## Changelogs

* [@azbake/ingredient-network-interface]

## Overview

The Network Interface ingredient is a plugin for bake. When included in a recipe, this will create an [Network Interface](https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-network-interface).


## Usage

```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-network-interface@~0"
resourceGroup: true
recipe:
  nic:
    properties:
      type: "@azbake/ingredient-network-interface"
      parameters:
        networkInterfaceName: "sample-nic "
        location: "centralus"
        subnetId: ""
```

| property | required | description |
| -------- | -------- | ----------- |
| networkInterfaceName | yes | The name for the Network Interface |
| location | no | Sets the location. Defaults to the parent resource group location. |
| subnetId | yes | Subnet to create Network interface |

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``networkinterface`` class

| function | description |
| `create_resource_name()` | Returns the name created for the Network Interface when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the Network Interface when deployed.

```yaml
...
parameters:
    planName: "[networkinterface.create_resource_name()]"
...
```

##### Returns

string