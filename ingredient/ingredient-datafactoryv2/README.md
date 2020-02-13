## Changelogs

* [@azbake/ingredient-service-bus-namespace](./CHANGELOG.md)

## Overview

The Service Bus Namespace ingredient is a plugin for bake. When included in a recipe, this will create a [Service Bus Namespace](https://docs.microsoft.com/en-us/azure/templates/microsoft.datafactory/2018-06-01/factories).

## Usage

```yaml
name: datafactoryv2test
shortName: logicalsqlserver
version: 1.0.0
ingredients:
  - "@azbake/ingredient-datafactoryv2@0~"
resourceGroup: true
rgOverride: HCHB_DataAdmins_DataWarehouse_Dev
parallelRegions: false
variables:
  name : "datafactoryv2test003"
  location : "centralus"
recipe:
  datafactory:
    properties:
      type: "@azbake/ingredient-datafactoryv2"
      parameters:
        name : "[coreutils.variable('name')]"
        location : "[coreutils.variable('location')]"
```

| property | required | description |
| -------- | -------- | ----------- |
| name | yes | The name for the Data Factory |
| location | no (default:[resourceGroup().location]) | The location of the Data Factory |
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

### ``datafactory`` class

| function | description |
| `create_resource_name()` | Returns the name created for the Service Bus Namespace when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the App Service Plan when deployed.

```yaml
...
parameters:
    planName: "[datafactory.create_resource_name()]"
...
```

##### Returns

string