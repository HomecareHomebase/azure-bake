## Changelogs

* [@azbake/ingredient-api-management-api](./CHANGELOG.md)

## Overview

The APIM API ingredient allows for easy registration & modification of APIs within an Azure APIM resource.

## Usage

```yaml
name: apim-api-test
shortName: apitest
version: 1.0.0
ingredients:
  - "@azbake/ingredient-apim-api@0~"
resourceGroup: true
rgOverride: test
parallelRegions: false
recipe:
  apim-test:
    properties:
      type: "@azbake/ingredient-apim-api"
      parameters:
        apiManagementServiceName: charlietestapim
        publisherEmail: john.smith@contoso.com
        publisherName: John Smith
        virtualNetworkName: testvnet
        virtualNetworkResourceGroupName: test
        SubnetName: testsubnet
        properties:
          foo:
            key: bar
            isSecret: true
            tags:
              - test
              - dev
        logger:
          testai:
            resourceGroup: test
            type: applicationInsights
            clean: true
          testai2:
            resourceGroup: test
            type: applicationInsights
```

##Properties
| property | required | description |
| -------- | -------- | ----------- |
| apiManagementServiceName | yes | Name for the API Management instance |
| publisherEmail | yes | Email for the primary API publisher |
| publisherName | yes | Name for the primary API publisher |
| virtualNetworkName | yes | Primary vNet connection |
| virtualNetworkResourceGroupName | yes | Resource group for the primary vNet |
| subnetName | yes | Name of the subnet in your vNet |
| properties | no | Array of objects for named key/value pairs |
| logger | no | Object for the connection of an Application Insights or EventHub Logger |

###Named Values
| property | required | description |
| -------- | -------- | ----------- |
| key | yes | Value to be stored with the key name |
| isSecret | no | Sets value to be encrypted | 
| tags | no | Array of tag values to be set |

###Logger
| property | required | description |
| -------- | -------- | ----------- |
| type | yes | Specifies an ApplicationInsights or EventHub Logger |
| resourceGroup | no | Resource group that the logger is located in |
| clean | no | Cleans up old keys for the logger instance specified. Defaults to `true` |

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``apim-base`` class

| function | description |
| `create_resource_name()` | Returns the name created for the API Management Instance when deployed |
| `get_logger(name: string, rg: string, match: string)` | Returns the logger name containing the match string |
| `get_property(name: string, rg: string, match: string)` | Returns the value of the key/value pair of the name in the 
match string |
| `get_api(name: string, rg: string, match: string)` | Returns the value of the API name in the match string |
| `get_backend(name: string, rg: string, match: string)` | Returns the value of the backend in the match string |

### Function Details

#### create_resource_name()

Gets the name created for the API Management Instance when deployed.

```yaml
...
parameters:
    name: "[apim-base.create_resource_name()]"
...
```
##### Returns

string

### get_logger(name: string, rg: string, match: string)
Returns the logger name containing the match string. For example if you specify `DEVAI` it will find all the loggers attached to the instance that container that match in their name.

```yaml
...
parameters:
    logger: "[apim-base.get_logger("testapim","test","devai")]"
...
```
##### Returns

string

### get_property(name: string, rg: string, match: string)
Returns the property value containing for the key containing match string. For example if you specify `DEVCONN` it will find the key attached to the instance that contains that match.

```yaml
...
parameters:
    property: "[apim-base.get_property("testapim","test","devconnstr")]"
...
```
##### Returns

string

### get_api(name: string, rg: string, match: string)
Returns the name of the API containing the match string.

```yaml
...
parameters:
    api: "[apim-base.get_api("testapim","test","testapi")]"
...
```

##### Returns

string

### get_backend(name: string, rg: string, match: string)
Returns the name of the Backend containing the match string.

```yaml
...
parameters:
    backend: "[apim-base.get_property("testapim","test","testbackend")]"
...
```

##### Returns

string