## Changelogs
* [@azbake/ingredient-event-hub-namespace](./CHANGELOG.md)

## Overview
The Event Hub Namespace ingredient is a plugin for Bake.  When included in a recipe, this plugin will create an Event Hub Namespace resource within Azure.

This ingredient is typically used in conjunction with the Event Hub ingredient.  The latter ingredient depends on this ingredient.


## Usage

### Recipe
```yaml
#Provide name 
name: Event Hubs Namespace Diagnostic Logs
shortName: ehndiag
version: 0.0.1
#Specify the names of the ingredients to use in the recipe.  This is the name of the ingredient in package.json.  
#Specify the local path to the module during development.
ingredients:
  - "@azbake/ingredient-event-hub-namespace"
#Deploys to regions in parallel.  Typically true unless the sequence of deploying to regions is important.
parallelRegions: true
#
resourceGroup: true
variables:
recipe:
  #Name the deployment.  This shows up in the log window and is the name of the deployment within Azure.
  ehndiag-deploy: 
    properties:
      #Specify the Bake ingredient above
      type: "@azbake/ingredient-event-hub-namespace"
      source: ""
      parameters:
        eventHubNamespaceName: "[eventhubnamespace.create_resource_name('diagnostics')]"        
        skuName: Basic
        skuTier: Basic
        skuCapacity: "1"
        isAutoInflateEnabled: "false"
        maximumThroughputUnits: "0"

```

| property|required|description|
|---------|--------|-----------|
|eventHubNamespaceName | yes | 
|location | no | The location for this resource. Default is the parent resource group geographic location. |
|skuName | no | The SKU name.  Allowed values are Basic and Standard (default). |
|skuTier | no | The SKU billing tier.  Allowed values are Basic and Standard (default). |
|skuCapacity | yes | The throughput capacity of the Event Hub. |
|isAutoInflateEnabled | yes | Indicates whether AutoInflate is enabled. |
|maximumThroughputUnits | yes | The upper limit of throughput units when AutoInflate is enabled. |

See [Event Hub Namespace SDK documentation for additional details](https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.management.eventhub.models.ehnamespace?view=azure-dotnet)

## Utilities
Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``eventhubnamespace`` class

|function|description|
|--------|-----------|
|create_resource_name| Returns the name of the Event Hub Namespace |

### Function Details
#### create_resource_name()
Returns the name of the Event Hub
```yaml
...
parameters:
    eventHubNamespaceName: "[eventhubnamespace.create_resource_name()]"
...
```
### Returns
string
