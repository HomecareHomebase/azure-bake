## Changelogs

* [@azbake/ingredient-sqlserver-logical](./CHANGELOG.md)

## Overview

The SQLServer Logical ingredient is a plugin for bake. When included in a recipe, this will create a [SQLServer Logical](https://docs.microsoft.com/en-us/azure/sql-database/sql-database-servers).

## Usage

```yaml
name: Sql Server Test
shortName: logicalsqlserver
version: 1.0.0
ingredients:
  - "@azbake/ingredient-sqlserver-logical@0~"
resourceGroup: true
rgOverride: HCHB_DataAdmins_DataWarehouse_Dev
variables:
  serverName : "testsqlserverlogical"
  administratorLogin : "testadmin"
  administratorLoginPassword : "Training2019"
  location : "centralus"
recipe:
  sqlserverlogical:
    properties:
      type: "@azbake/ingredient-sqlserver-logical"
      parameters:
        serverName : "[coreutils.variable('serverName')]"
        administratorLogin : "[coreutils.variable('administratorLogin')]"
        administratorLoginPassword : "[coreutils.variable('administratorLoginPassword')]"
        location : "[coreutils.variable('location')]"

```

| property | required | description |
| -------- | -------- | ----------- |
| serverName | yes | The name of the SQL logical server. |
| administratorLogin | Yes | The administrator username of the SQL logical server. |
| administratorLoginPassword | Yes | The administrator password of the SQL logical server. |
| location | Yes (default:[resourceGroup().location]) | Location for all resources. |

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``SqlServerLogicalUtils`` class

| function | description |
| `create_resource_name()` | Returns the name created for the Service Bus Namespace when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the App Service Plan when deployed.

```yaml
...
parameters:
    planName: "[SqlServerLogicalUtils.create_resource_name()]"
...
```

##### Returns

string