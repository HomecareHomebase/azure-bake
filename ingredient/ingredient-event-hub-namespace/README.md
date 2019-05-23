## Changelogs
* [@azbake/ingredient-event-hub-namespace](./CHANGELOG.md)

## Overview
The Event Hub Namespace ingredient is a plugin for Bake.  When included in a recipe, this plugin will create an Event Hub Namespace resource within Azure.

This ingredient is typically used in conjunction with the Event Hub ingredient.  The latter ingredient depends on this ingredient.

Diagnostic settings are enabled by default and will send to a special diagnostics Event Hub Namespace.  Note that the diagnostics event hub namespace should be created beforehand (or within the same recipe) if you enable diagnostic settings.

## Usage

### Recipe
```yaml
#This recipe deploys two event hub namespaces.  
#The GlobalProduct event hub namespace sends it's diagnostic logs and metrics to the Diagnostics event hub namespace.
#Provide name 
name:  Global Product Event Hubs Namespace
shortName: globalProduct
version: 0.0.1
#Specify the names of the ingredients to use in the recipe.  This is the name of the ingredient in package.json.  
#Specify the local path to the module during development.
ingredients:
  - "@azbake/ingredient-event-hub-namespace"
#Deploys to regions in parallel.  Typically true unless the sequence of deploying to regions is important.
parallelRegions: true
#rgOverride: 
resourceGroup: true
variables:
recipe:
  #Name the deployment.  This shows up in the log window and is the name of the deployment within Azure.
  globalProduct-deploy: 
    properties:
      #Specify the Bake ingredient above
      type: "@azbake/ingredient-event-hub-namespace"
      source: ""
      parameters:
        eventHubNamespace: "[eventhubnamespace.get_resource_name('globalproduct')]"      
        skuName: Standard
        skuTier: Standard
        skuCapacity: "1"
        #Enabling diagnostics.  Default values are being used for other diagnostics parameters.
        diagnosticsEnabled: "yes"
      dependsOn:
        - diagnostics-deploy
  #Name the deployment.  This shows up in the log window and is the name of the deployment within Azure.
  diagnostics-deploy: 
    properties:
      #Specify the Bake ingredient above
      type: "@azbake/ingredient-event-hub-namespace"
      source: ""
      parameters:
        eventHubNamespace: "[eventhubnamespace.get_resource_name('diagnostics')]"      
        skuName: Standard
        skuTier: Standard
        skuCapacity: "1"
        #Disabling diagnostics
        diagnosticsEnabled: "no"
```

| property|required|default|description|
|---------|--------|--------|-----------|
|eventHubNamespace | yes | | | The name of the Event Hub Namespace
|location | no | Parent resource group geographic location. | The location for this resource. |
|skuName | no | Standard | The SKU name.  Allowed values are Basic and Standard. |
|skuTier | no | Standard | The SKU billing tier.  Allowed values are Basic and Standard. |
|skuCapacity | yes | The throughput capacity of the Event Hub.  Allowed values are 1 to 20. |
|isAutoInflateEnabled | yes | true | Indicates whether AutoInflate is enabled. |
|maximumThroughputUnits | yes | 10 | The upper limit of throughput units when AutoInflate is enabled. |
|diagnosticsEnabled | no | yes | Enables a diagnostic setting to sent metrics and logs to a special diagnostics event hub namespace. |
See [Event Hub Namespace SDK documentation for additional details](https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.management.eventhub.models.ehnamespace?view=azure-dotnet)

## Utilities
Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``eventhubnamespace`` class

|function | description |
|--------|-----------|
|get_resource_name| Returns a resource name for an Event Hub Namespace |
|get_resource_group | Returns a resource group 

### Function Details
#### create_resource_name()
Returns the name of the Event Hub Namespace as ``<environment><region>ehn<name>``
```yaml
...
parameters:
    eventHubNamespace: "[eventhubnamespace.get_resource_name('diagnostics')]"
...
```
### Returns
string

#### get_resource_group()
Returns the resource group name as ``<environment><region>ehn``
```yaml
...
parameters:
    resourceGroup: "[eventhubnamespace.get_resource_group()]"
...
```
### Returns
string
