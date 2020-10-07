## Changelogs

* [@azbake/ingredient-cosmosdb]

## Overview

The Cosmosdb ingredient is a plugin for bake. When included in a recipe, this will create an [Cosmos db account](https://azure.microsoft.com/en-us/services/cosmos-db/).
This only creates the core account. Individual applications are responsible for creating and maintaining Containers / Databases / Collections.



## Usage

```yaml
name: cosmosdatabase
shortName: cosmosdb
version: 1.0.0
ingredients:
   - "@azbake/ingredient-cosmosdb@~0"
   - "@azbake/ingredient-event-hub-namespace@~0"
rgOverride: "larry-poc"
resourceGroup: true
variables:
  dbResourceName: "[cosmosdbutils.create_resource_name()]"
  capabilities: "[JSON.parse('[{\"name\" : \"EnableServerless\" }]')]"
recipe:
  cosmosdb-create:
    properties:
      type: "@azbake/ingredient-cosmosdb"
      condition: "[coreutils.current_region_primary()]" 
      parameters:
        accountName: "[coreutils.variable('dbResourceName')]"
        primaryRegion: "[coreutils.current_region().name]"
        capabilities : "[coreutils.variable('capabilities')]"
```

| property | required | description |
| -------- | -------- | ----------- |
| accountName | yes | The name for the Cosmosdb Account |
| primaryRegion | yes | Sets the region.  |
| secondaryRegion | No | Sets the region.  |
| capabilities | no | Allows for Serverless mode, using [JSON.parse('[{\"name\" : \"EnableServerless\" }]')]". Also used for creating Mongo/Cassandra see https://github.com/Azure/azure-quickstart-templates/blob/master/101-cosmosdb-create-multi-region-account/azuredeploy.json  or [API Reference](https://docs.microsoft.com/en-us/azure/templates/microsoft.documentdb/databaseaccounts)|


## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.


### ``cosmosdbutils`` class

| function | description |
| -------- | ----------- |
| `create_resource_name()` | Returns the name created for the Key Vault when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the Key Vault when deployed.

```yaml
...
parameters:
    name: "[cosmosdbutils.create_resource_name()]"
...
```

##### Returns

string