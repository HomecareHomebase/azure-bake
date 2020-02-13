## Changelogs

* [@azbake/ingredient-sql-dwh](./CHANGELOG.md)

## Overview

The SQL Data Warehouse ingredient is a plugin for bake. When included in a recipe, this will create a [SQL Data Warehouse](https://docs.microsoft.com/en-us/azure/templates/microsoft.sql/2014-04-01/servers/databases#DatabaseProperties).

## Usage

```yaml
name: sqlserver-sql-dwh
shortName: sqldwh
version: 1.0.0
ingredients:
  - "@azbake/ingredient-sql-dwh@0~"
resourceGroup: true
rgOverride: HCHB_DataAdmins_DataWarehouse_Dev
parallelRegions: false
variables:
  databaseName : "testsqldwh"
  skuName : "DW100c"
  serverName : "testsqlserverlogical"
  serverLocation : "centralus"
  collation : "SQL_Latin1_General_CP1_CI_AS"
  databaseTags : {}
recipe:
  namespace:
    properties:
      type: "@azbake/ingredient-sql-dwh"
      parameters:
        databaseName : "[coreutils.variable('databaseName')]"
        skuName : "[coreutils.variable('skuName')]"
        serverName : "[coreutils.variable('serverName')]"
        serverLocation : "[coreutils.variable('serverLocation')]"
        collation : "[coreutils.variable('collation')]"
        databaseTags : "[coreutils.variable('databaseTags')]"
```

| property | required | description |
| -------- | -------- | ----------- |
| databaseName | yes | The name of the SQL Data Warehouse. |
| requestedServiceObjectiveId | Yes | Service tier of the SQL Data Warehouse. Use the Capabilities_ListByLocation REST API |
| serverName | Yes | Logical SQL Server Name. |
| serverLocation | No (default:[resourceGroup().location]) | Azure data center location. |
| collation |  Yes | Database collation |
| databaseTags | no (default:Default) | Resource tags  |
| diagnosticsEnabled | no (default `yes`) |  Specifies whether to enable diagnostic settings to make logs available for consumption.  **_Note that you must reference @azbake/ingredient-event-hub-namespace when diagnostics are enabled._** |

| variable |required|default|description|
|---------|--------|-----------|-----------|
| blobDiagnosticHourlyMetricsEnabled | no | "true" | Enables recording of hourly metrics to Storage Analytics. Currently accepts "true" / "false" as strings only. |
| blobDiagnosticHourlyMetricsRetentionDays | no | 10 | Data retention of hourly metrics in Storage Analytics. |
| blobDiagnosticMinuteMetricsEnabled | no | "true" | Enables recording of minute metrics to Storage Analytics. Currently accepts "true" / "false" as strings only.  |
| blobDiagnosticMinuteMetricsRetentionDays | no | 10 | Data retention of minute metrics in Storage Analytics |
| blobDiagnosticLoggingEnabled | no | "true" | Enables recording of diagnostic logs to Storage Analytics.   Currently accepts "true" / "false" as strings only. |
| blobDiagnosticLoggingRetentionDays | 10 | "true" | Data retention of diagnostic logs in Storage Analytics |

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