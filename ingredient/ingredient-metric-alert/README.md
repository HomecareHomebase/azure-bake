## Changelogs
* [@azbake/ingredient-metric-alert](./CHANGELOG.md)

## Overview
The Metric Alert ingredient is a plugin for Bake.  When included in a recipe, this plugin will create an Alert Rule for an Azure resource. 

## Usage

### Recipe
```yaml
#Provide name 
name: Alert for Event Hub Namespace
shortName: ehnAlert
version: 0.0.1
#Specify the names of the ingredients to use in the recipe.  This is the name of the ingredient in package.json.  
#Specify the local path to the module during development.
ingredients:
  - "@azbake/ingredient-metric-alert@~0"
  - "@azbake/ingredient-arm@~0"
  - "@azbake/ingredient-event-hub-namespace@~0"
#Deploys to regions in parallel.  Typically true unless the sequence of deploying to regions is important.
parallelRegions: true
#
rgOverride: WHILKE-POC
resourceGroup: true
variables:
recipe:
  ehndiag-deploy: 
    properties:
    #Specify the Bake ingredient above
      type: "@azbake/ingredient-event-hub-namespace"
      source: ""
      parameters:    
        eventHubNamespaceName: "[eventhubnamespace.create_resource_name()]"            
        location: "East US"
        skuName: Basic
        skuTier: Basic
        skuCapacity: "1"
        isAutoInflateEnabled: "false"
        maximumThroughputUnits: "0"  
  #Name the deployment.  This shows up in the log window and is the name of the deployment within Azure.
  alert-deploy: 
    properties:
    #Specify the Bake ingredient above
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
        evaluationFrequency: "PT1M"
        actionGroupId: "TODO: Not currently supported"
    dependsOn:
      - ehndiag-deploy
```

| property|required|description|
|---------|--------|-----------|
| source | yes | Name of the target resource for the metric that the alert is monitoring |
| alertName | yes | Name of the Alert resource |
| alertSeverity | no | The severity level of the alert.  Defaults to 3. |
| isEnabled | no | Specifies whether the alert is enabled.  Defaults to true. |
| source-type | yes | The [metric namespace](https://docs.microsoft.com/en-us/azure/azure-monitor/platform/metrics-supported) of the alert.  An example is Microsoft.KeyVault/vaults.  |
| metricName | yes | The name of the metric that the alert is monitoring |
| operator | no | The comparison operator for the alert.  Defaults to "GreaterThan". |
| threshold | yes | The threshold value to trigger the alert. |
| timeAggregation | yes | The aggregation function used for comparing against the threshold.  Defaults to "Average".|
| windowSize | no | Period of time used to monitor alert activity based on the threshold.  Defaults to PT5M. Must be between five minutes and one day. ISO 8601 duration format. |
| evaluationFrequency| no | How often the metric alert is evaluated represented in ISO 8601 duration format.  Defaults to PT1M. |
| actionGroupId | no | The action group to trigger when the alert is fired.  TODO - Not yet supported. |

See [Event Hub SDK documentation for additional details](https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.management.eventhub.models.eventhub?view=azure-dotnet#properties)

## Utilities
Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``metricalert`` class
No functions at this time.