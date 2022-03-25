## Changelogs

* [@azbake/ingredient-postgresql]

## Overview

The PostgreSQL ingredient is a plugin for bake. When included in a recipe, this will create an [Azure Database for PostgreSQL server](https://docs.microsoft.com/en-us/azure/postgresql/).
This only creates the core account. Individual applications are responsible for creating and maintaining Containers / Databases / Collections.

Currently this is only able to create a Flexible server. Azure is pushing users away from Single server, but if this is needed, the plugin can be enhanced to use the `src/SingleServerArm.json` template.

## Usage

```yaml
name: mypostgresdb
shortName: mypgsql
version: 1.0.0
ingredients:
   - "@azbake/ingredient-postgresql@0.*"
resourceGroup: true
variables:
  dbServerName: "[postgresqldbutils.create_resource_name()]"
recipe:
  backstage-db:
    properties:
      type: "@azbake/ingredient-postgresql"
      parameters:
        administratorLogin: "testadmin"
        administratorLoginPassword: "testbadpass"
        location: "[coreutils.current_region().name]"
        serverName: "[coreutils.variable('dbServerName')]"
        serverEdition: "Burstable" # "GeneralPurpose"
        skuSizeGB: 32 # 32 is apparently the minimum but it's only $0.115/GB/mo
        dbInstanceType: "Standard_B1ms"
        haMode: "Disabled"
        availabilityZone: ""
        version: "13"
        tags:
        firewallRules:
        backupRetentionDays: 14
        geoRedundantBackup: "Disabled"
        virtualNetworkExternalId: ""
        subnetName: ""
        privateDnsZoneArmResourceId: ""
```

| property | required | description |
| -------- | -------- | ----------- |
| administratorLogin | yes | The username for the server admin |
| administratorLoginPassword | yes | Admin password  |
| serverName | Yes | Server name  |
| location | No | Region name. ex `[coreutils.current_region().name]` or `eastus` |
| serverEdition | No | ex `Burstable` or `GeneralPurpose` |
| skuSizeGB | No | Minimum 32 GB. Billed at $0.115/GB/mo|
| dbInstanceType | No | VM size. ex `Standard_B1ms` |
| haMode | No | High Availability mode. ex `Disabled` or `ZoneRedundant` |
| availabilityZone | No | Preferred availability zone. ex `1` or `2` |
| version | No | Postgres version ex `12` or `13` |
| tags | No |  |
| firewallRules | No | |
| backupRetentionDays | No | |
| geoRedundantBackup | No | |
| virtualNetworkExternalId | No | |
| subnetName | No | |
| privateDnsZoneArmResourceId | No | |


## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.


### ``postgresqldbutils`` class

| function | description |
| -------- | ----------- |
| `create_resource_name()` | Returns the name created for the resource when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the resource when deployed.

```yaml
...
parameters:
    name: "[postgresqldbutils.create_resource_name()]"
...
```

##### Returns

string