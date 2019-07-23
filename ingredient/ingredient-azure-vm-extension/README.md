## Changelogs
* [@azbake/ingredient-event-hub](./CHANGELOG.md)

## Overview
The Event Hub ingredient is a plugin for Bake.  When included in a recipe, this plugin will create an Event Hub resource within Azure.  It will also create a Shared Access Policy for the Event Hub.

This ingredient does not deploy an Event Hub namespace.  It expects the namespace to already exist.  The namespace can be created in another recipe or within the same recipe.


## Usage

### Recipe
```yaml
#Provide name 
name: Event Hub Name
shortName: ehShortName
version: 0.0.1
#Specify the names of the ingredients to use in the recipe.  This is the name of the ingredient in package.json.  
#Specify the local path to the module during development.
ingredients:
  - "@azbake/ingredient-event-hub"
  - "@azbake/ingredient-event-hub-namespace"
#Deploys to regions in parallel.  Typically true unless the sequence of deploying to regions is important.
parallelRegions: true
resourceGroup: true
variables:
recipe:
  #Name the deployment.  This shows up in the log window and is the name of the deployment within Azure.
  eh-deploy: 
    properties:
      #Specify the Bake ingredient above
      type: "@azbake/ingredient-event-hub"
      source: ""
      parameters:        
        eventHubName: "[eventhub.create_resource_name()]"        
        eventHubNamespaceName: "[eventhubnamespace.get_resource_name('diagnostics')]"
        messageRetentionInDays: "1"
        partitionCount: "2"
        policyName: "defaultPolicy"
```

| property|required|description|
|---------|--------|-----------|
| eventHubName | yes | Name of the Event Hub resource |
| eventHubNamespaceName | yes | Name of the Event Hub namespace |
| messageRetentionInDays | no | Number of days to retain a message.  Defaults to 7.  Allowed values are SKU dependent. |
| partitionCount | no | Number of partitions.  Defaults to 2.  Allowed values are SKU dependent. |
| location | no | The location for this resource. Default is the parent resource group geographic location |
| policyName | no | The name of the Shared Access Policy.  Defaults to ListenSend.
| policyRights | no | The rights to grant the Shared Access Policy.  Defaults to ["Listen", "Send"].

See [Event Hub SDK documentation for additional details](https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.management.eventhub.models.eventhub?view=azure-dotnet#properties)

## Utilities
Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``eventhub`` class

|function|description|
|--------|-----------|
|create_resource_name| Returns the name of the Event Hub |
|get_primary_key | Returns the primary access key | 
|get_secondary_key | Returns the secondary access key |
|get_primary_connectionstring | Returns the primary connection string |
|get_secondary_connectionstring | Returns the secondary connection string |

### Function Details
#### create_resource_name()
Returns the name of the Event Hub
```yaml
...
parameters:
    eventHubName: "[eventhub.create_resource_name()]"
...
```
### Returns
string

#### get_primary_key()
Returns the primary access key
```yaml
...
parameters:
    primary: "[eventhub.get_primary_key(eventhubnamespace.get_resource_name('ehnName'), eventhub.create_resource_name(), 'defaultPolicy')]"
...
```
### Returns
string

#### get_secondary_key()
Returns the secondary access key
```yaml
...
parameters:
    secondary: "[eventhub.get_secondary_key(eventhubnamespace.get_resource_name('ehnName'), eventhub.create_resource_name(), 'defaultPolicy')]"
...
```
### Returns
string


#### get_primary_connectionstring()
Returns the primary connection string
```yaml
...
parameters:
    primary: "[eventhub.get_primary_connectionstring(eventhubnamespace.get_resource_name('ehnName'), eventhub.create_resource_name(), 'defaultPolicy')]"
...
```
### Returns
string


#### get_secondary_connectionstring()
Returns the secondary connection string
```yaml
...
parameters:
    secondary: "[eventhub.get_secondary_connectionstring(eventhubnamespace.get_resource_name('ehnName'), eventhub.create_resource_name(), 'defaultPolicy')]"
...
```
### Returns
string

