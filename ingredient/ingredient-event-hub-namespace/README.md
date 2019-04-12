## Changelogs
* [@azbake/ingredient-event-hub-namespace](./CHANGELOG.md)

## Overview
TODO


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
  - "@azbake/ingredient-event-hub-namespace@~0"
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
        name: "[eventhubnamespace.create_resource_name()]"        
        location: "East US"
        skuName: Basic
        skuTier: Basic
        skuCapacity: "1"
        isAutoInflateEnabled: "false"
        maximumThroughputUnits: "0"

```
