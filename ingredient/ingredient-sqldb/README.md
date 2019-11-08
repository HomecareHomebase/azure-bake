## Changelogs

* [@azbake/ingredient-sqldb](./CHANGELOG.md)

## Overview

The SQLServer Logical ingredient is a plugin for bake. When included in a recipe, this will create a [SQL Database](https://docs.microsoft.com/en-us/azure/sql-database/sql-database-servers).

## Usage

```yaml
name: SQL SB
shortName: sqldbdeployment
version: 1.0.0
ingredients:
  - "@azbake/ingredient-sqldb@0~"
resourceGroup: true
rgOverride: HCHB_DataAdmins_DataWarehouse_Dev
variables:
  collation : "SQL_Latin1_General_CP1_CI_AS"
  databaseName : "testdb"
  tier : "Basic"
  skuName : "Basic"
  maxSizeBytes : 2147483648
  serverName : "testsqlserverlogical"
  serverLocation : "centralus"
  sampleName : 
  zoneRedundant : False
  licenseType : 
  readScaleOut : "Disabled"
  numberOfReplicas : 0
  minCapacity : 
  autoPauseDelay : 
  databaseTags :  {}
  enableADS : False
  enableVA : False
recipe:
  sqlserverlogical:
    properties:
      type: "@azbake/ingredient-sqldb"
      parameters:
        serverName : "[coreutils.variable('serverName')]"
        collation : "[coreutils.variable('collation')]"
        databaseName : "[coreutils.variable('databaseName')]"
        tier : "[coreutils.variable('tier')]"
        skuName : "[coreutils.variable('skuName')]"
        maxSizeBytes : "[coreutils.variable('maxSizeBytes')]"
        serverLocation : "[coreutils.variable('serverLocation')]"
        sampleName : "[coreutils.variable('sampleName')]"
        zoneRedundant : "[(coreutils.variable('zoneRedundant') == true)]" #this is only available in premium
        licenseType : "[coreutils.variable('licenseType')]"
        readScaleOut : "[coreutils.variable('readScaleOut')]"
        databaseTags : "[coreutils.variable('databaseTags')]"
        minCapacity : "[coreutils.variable('minCapacity')]"
        #numberOfReplicas : "[coreutils.variable('numberOfReplicas')]" #this is only available in premium
        autoPauseDelay : "[coreutils.variable('autoPauseDelay')]"
        enableADS : "[(coreutils.variable('enableADS') == true)]"
        enableVA : "[(coreutils.variable('enableVA') == true)]"
   

```

| property | required | description |
| -------- | -------- | ----------- |
| collation | yes | Database collation defines the rules that sort and compare data, and cannot be changed after database creation. The default database collation is SQL_Latin1_General_CP1_CI_AS |
| databaseName | Yes | Name of the Azure SQL Database |
| tier | Yes | Tiers are Basic, Standard, Premium, etc... |
| skuName | no (default:false) | Sku refers to DTU. |
| maxSizeBytes |  no (default:true) | Database size in kilobytes|
| serverName | Yes  |  Logical Sql Server name. |
| serverLocation | Yes | Resource Group of Logical SQL Server. |
| sampleName | No | Valid options are AdventureWorksLIT |
| zoneRedundant | No (default:[False]) | Available to SQL single databases and elastic pools in the Premium service tier at no extra cost. Meaning replicas of this database will be spread across multiple availability zones |
| licenseType | No (default:[BasePrice]) | License type to apply for this database. Valid options are LicenseIncluded, BasePrice |
| readScaleOut | No (default:[Disabled]) | Connections that have application intent set to readonly in their connection string may be routed to a readonly secondary replica |
| numberOfReplicas | No (default:[0]) | Number of SQL Server Database replicas. |
| minCapacity | No (default:[null]) | Minimal capacity that database will always have allocated |
| autoPauseDelay | No (default:[null]) | Minutes after which database is automatically paused. A value of -1 means that automatic pause is disabled |
| databaseTags | No (default:[{}]) | Azure resource tags |
| enableADS | No (default:[False]) | Protect your data using Advanced Data Security, a unified security package including Data Classification, Vulnerability Assessment and Advanced Threat Protection for your server. |
| enableVA | No (default:[False]) | Enable database vulnerability assessment. |

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