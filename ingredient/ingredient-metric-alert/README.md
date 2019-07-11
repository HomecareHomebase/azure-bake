## Changelogs
* [@azbake/ingredient-metric-alert](./CHANGELOG.md)

## Overview
The Metric Alert ingredient is a plugin for Bake.  When included in a recipe, this plugin will create a custom Alert Rule for an Azure resource. 

## Usage

### Recipe
```yaml
name: Event Hub Namespace for diagnostics with a custom metric alert
shortName: diagnostics
version: 0.0.1
ingredients:
  - "@azbake/ingredient-metric-alert@~0"
  - "@azbake/ingredient-event-hub-namespace@~0"
parallelRegions: true
#rgOverride:
resourceGroup: true
variables:
recipe:
  ehndiag-deploy: 
    properties:
      type: "@azbake/ingredient-event-hub-namespace"
      source: ""
      parameters:    
        eventHubNamespaceName: "[eventhubnamespace.get_resource_name()]"            
        skuName: Standard
        skuTier: Standard
        skuCapacity: "1"
        isAutoInflateEnabled: "true"
        maximumThroughputUnits: "10"  
  alert-deploy: 
    properties:
      type: "@azbake/ingredient-metric-alert"
      source: "[eventhubnamespace.get_resource_profile()]"
      parameters:
        alertName: "Event Hub Namespace Alert"
        alertDescription: "New alert created via Bake"
        alertSeverity: 3
        isEnabled: true
        source-type: "Microsoft.EventHub/namespaces"
        metricName: "ThrottledRequests"
        operator: "GreaterThan"
        threshold: "0"
        timeAggregation: "Maximum"
        windowSize: "PT5M"
        evaluationFrequency: "PT5M"
        actionGroupName: "[coreutils.create_resource_name('act','emailops', false)]"
        actionGroupResourceGroup: "[coreutils.create_resource_name('','actiongroups', true)]"
        #Uncomment below and comment above if using rgOverride 
        #actionGroupResourceGroup: "[coreutils.resource_group()]"
        #alertType: "Static"
        alertType: "Dynamic"
        #Dynamic alert params have defaults.  Uncomment and specify below to override defaults.
        # dynamicAlertParameters:
        #   alertSensitivity: "Low"
        #   failingPeriods:
        #     numberOfEvaluationPeriods: "4"
        #     minFailingPeriodsToAlert: "3"
    dependsOn:
      - ehndiag-deploy
```

| property|required|description|
|---------|--------|-----------|
| source | yes | Name of the target resource for the metric that the alert is monitoring. |
| alertName | yes | Name of the Alert resource. |
| alertSeverity | no (default `3`) | The severity level of the alert. |
| isEnabled | no (default `true`) | Specifies whether the alert is enabled.|
| source-type | yes | The [metric namespace](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported) of the alert.  An example is Microsoft.KeyVault/vaults.  |
| metricName | yes | The name of the metric that the alert is monitoring. |
| operator | yes | The comparison operator for the alert. |
| threshold | yes | The threshold value to trigger the alert. |
| timeAggregation | no (default `Average`) | The aggregation function used for comparing against the threshold. 
| windowSize | no (default `PT5M`) | Period of time used to monitor alert activity based on the threshold.  Must be between five minutes and one day. ISO 8601 duration format. |
| evaluationFrequency| no (default `PT5M`) | How often the metric alert is evaluated represented in ISO 8601 duration format.|
| actionGroupName | yes | The name of the action group to trigger when the alert is fired.|
| actionGroupResourceGroup | yes | The action group's resource group.|
| alertType | yes | Static or Dynamic (AIOps) |
| dynamicAlertProperties | no (default below) | Object for specifying dynamic alert properties. |

**dynamicAlertProperties object**
| property|required|description|
|---------|--------|-----------|
| alertSensitivity | no (default `Low`) | Low, Medium, and High sensitivities (in order of least to most noisy alerts.)
| failingPeriods | no (default below) | Object for specifying dynamic alert failing periods properties. |

**failingPeriods object** - this advanced criteria defaults to fire the alert if 3 of of the last 4 evaluation periods failed
| property|required|description|
|---------|--------|-----------|
| numberOfEvaluationPeriods | no (default `4`) | The total number of periods for evaluating against the failing periods. |
| minFailingPeriodsToAlert | no (default `3`)| The minimum number of failing periods to fire the alert. |


**See Azure Monitor documentation for additional details**

[Platform metric alert rules - Using Resource Manager template](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/alerts-metric-create-templates)

[Azure Monitor REST API - Metric Alerts - Create or Update](https://docs.microsoft.com/en-us/rest/api/monitor/metricalerts/createorupdate)


## Utilities
Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``metricalert`` class
No functions at this time.