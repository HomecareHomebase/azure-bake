## Changelogs

* [@azbake/ingredient-postgresql](./CHANGELOG.md)

## Overview

The PostgreSQL ingredient is a plugin for bake. When included in a recipe, this will create an [Azure Database for PostgreSQL server](https://docs.microsoft.com/en-us/azure/postgresql/).
This only creates the server resource and admin account. Individual applications are responsible for creating and maintaining Containers / Databases / Collections.

Currently this is only able to create a Flexible server. Azure is pushing users away from Single server, but if this is needed, the plugin can be enhanced with a new template based on [this](https://docs.microsoft.com/en-us/azure/postgresql/quickstart-create-postgresql-server-database-using-arm-template?tabs=azure-portal).

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
  adminLogin: "testadmin"
  adminPass: "dontusethis"
recipe:
  mypostgres-db:
    properties:
      type: "@azbake/ingredient-postgresql"
      parameters:
        administratorLogin: "[coreutils.variable('adminLogin')]"
        administratorLoginPassword: "[coreutils.variable('adminPass')]"
        location: "[coreutils.current_region().name]"
        serverName: "[coreutils.variable('dbServerName')]"
        access: "private" 
        serverEdition: "Burstable" 
        skuSizeGB: 32 
        dbInstanceType: "Standard_B1ms"
        haMode: "Disabled"
        availabilityZone: ""
        version: "13"
        firewallRules:
          rules:
            - name: "testrule"
              startIPAddress: "192.168.0.0"
              endIPAddress: "192.168.0.1"
        backupRetentionDays: 14
        geoRedundantBackup: "Disabled"
        virtualNetworkExternalId: ""
        subnetName: "pgsql"
        virtualNetworkName: "YOUR_VNET_HERE"
        virtualNetworkResourceGroup: "SOME_RG"
        privateDnsZoneArmResourceId: ""
```

| property | required | description |
| -------- | -------- | ----------- |
| administratorLogin | yes | The username for the server admin |
| administratorLoginPassword | yes | Admin password  |
| serverName | Yes | Server name  |
| access | Yes | "public" or "private" |
| location | No | Region name. ex `[coreutils.current_region().name]` or `eastus` |
| serverEdition | No | ex `Burstable` or `GeneralPurpose` |
| skuSizeGB | No | Minimum 32 GB. Billed at $0.115/GB/mo|
| dbInstanceType | No | VM size. ex `Standard_B1ms` |
| haMode | No | High Availability mode. ex `Disabled` or `ZoneRedundant` |
| availabilityZone | No | Preferred availability zone. ex `1` or `2` |
| version | No | Postgres version ex `12` or `13` |
| firewallRules | No | a "rules" object with an array of rules. By default, no public IP addresses are allowed. |
| backupRetentionDays | No | Default 14 |
| geoRedundantBackup | No | Default `Disabled` |
| virtualNetworkExternalId | No | For **public** access servers only. Default empty string, which is treated as "Enabled". |
| subnetName | No | For **private** access servers only. The name of an existing subnet that's empty or already delegated to PostgreSQL. Must be a subnet of **virtualNetworkName** |
| virtualNetworkName | No | For **private** access servers only. The name of an existing virtual network with subnet **subnetName** |
| virtualNetworkResourceGroup | No | For **private** access servers only. RG of Vnet |
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