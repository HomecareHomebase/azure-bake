## Changelogs

* [@azbake/ingredient-sqlserver-logical](./CHANGELOG.md)

## Overview

The SQLServer Logical ingredient is a plugin for bake. When included in a recipe, this will create a [SQLServer Logical](https://docs.microsoft.com/en-us/azure/sql-database/sql-database-servers).

## Usage

```yaml
name: databricks
shortName: databricks
version: 1.0.0
ingredients:
  - "@azbake/ingredient-databricks@~"
resourceGroup: true
rgOverride: HCHB_DataAdmins_DataWarehouse_Dev
parallelRegions: false
variables:
  location : "centralus"
  workspaceName : "az_databricks_test"
  tier : "premium"
recipe:
  namespace:
    properties:
      type: "@azbake/ingredient-databricks"
      parameters:
        location : "[coreutils.variable('location')]"
        workspaceName : "[coreutils.variable('workspaceName')]"
        tier : "[coreutils.variable('tier')]"
```

| property | required | description |
| -------- | -------- | ----------- |
| location | No | The geo-location where the resource lives |
| workspaceName | Yes | The name of the workspace. |
| tier | Yes | The SKU tier. |
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

### ``DataBricksUtils`` class

| function | description |
| `create_resource_name()` | Returns the name created for the Service Bus Namespace when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the App Service Plan when deployed.

```yaml
...
parameters:
    planName: "[DataBricksUtils.create_resource_name()]"
...
```

##### Returns

string