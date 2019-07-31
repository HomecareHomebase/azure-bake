## Changelogs
* [@azbake/ingredient-azure-vm-extension](./CHANGELOG.md)

## Overview
The Azure VM Extension ingredient is a plugin for Bake.  When included in a recipe, this plugin will create an Event Hub resource within Azure.  It will also create a Shared Access Policy for the Event Hub.

This ingredient does not deploy an Event Hub namespace.  It expects the namespace to already exist.  The namespace can be created in another recipe or within the same recipe.


## Usage

### Recipe
```yaml
name: vm-ext-test
shortName: vmext
version: 1.0.0
ingredients:
  - "@azbake/ingredient-azure-vm-extension@0.0.1"
resourceGroup: true
rgOverride: "test"
parallelRegions: false
recipe:
  vmext:
    properties:
      type: "@azbake/ingredient-azure-vm-extension"
      parameters:
        extName: "InstallCustomScript"
        vmName: "testvm"
        publisher: "Microsoft.Azure.Extensions"
        typeHandlerVersion: "2.0"        
        extensionType: "CustomScript"
        settings:
          fileUris: 
            - "https://raw.githubusercontent.com/Azure/azure-quickstart-templates/master/201-customscript-extension-public-storage-on-ubuntu/scripts/hello.sh"
          commandToExecute: "sh hello.sh"   
```
| property|required|description|
|---------|--------|-----------|
| extName | yes | Name of the VM Extension |
| vmName | yes | Name of the VM on which to install the extension |
| typeHandlerVersion | yes | Version of the VM Extension script handler |
| publisher | no | Publisher of the extension handler publisher |
| extensionType | no | The type of the extension being used | 
| partitionCount | no | Number of partitions.  Defaults to 2.  Allowed values are SKU dependent. |
| settings | no | Object representing the custom properties of your extension |
| protectedSettings | no | Object representing the custom secret properties of your extension | 

See [Azure VM Extension documentation for additional details](https://docs.microsoft.com/en-us/dotnet/api/microsoft.azure.management.compute.fluent.virtualmachineextension.definition?view=azure-dotnet&viewFallbackFrom=azure-node)

## Utilities
Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``eventhub`` class

|function|description|
|--------|-----------|
|create_resource_name| Returns the name of the Event Hub |
| get | Returns the name of the VM Extension on a vm | 
| list | Returns the name of the Extensions installed on a VM |
| delete | Removes the VM extension from the specified VM |
|get_primary_connectionstring | Returns the primary connection string |
|get_secondary_connectionstring | Returns the secondary connection string |

### Function Details
#### create_resource_name()
Returns the name of the Event Hub
```yaml
...
parameters:
    eventHubName: "[vmextensionsutility.create_resource_name()]"
...
```
### Returns
string

### get(rg: string, vmName: string, vmExtensionName: string)
Gets the name of the extension installed on a vm
```yaml
...
parameters:
    eventHubName: "[vmextensionsutility.get('test','testvm','testext')]"
...
```
### Returns
string
    
### list(rg: string, vmName: string)
Lists the names of the extensions installed on a vm
```yaml
...
parameters:
    eventHubName: "[vmextensionsutility.list('test','testvm')]"
...
```
### Returns
string[]

### delete(rg: string, vmName: string, vmExtensionName: string)
Gets the specified extension installed on a vm
```yaml
...
parameters:
    eventHubName: "[vmextensionsutility.delete('test','testvm','testext')]"
...
```
### Returns
string

### update(rg: string, vmName: string, vmExtensionName: string, extensionParameters: VirtualMachineExtensionUpdate)
Updates the extension installed on a vm
```yaml
...
parameters:
    eventHubName: "[vmextensionsutility.delete('test','testvm','testext', 'updateobject: {}')]"
...
```
### Returns
string
