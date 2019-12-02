## Changelogs

* [@azbake/ingredient-key-vault]

## Overview

The Key Vault ingredient is a plugin for bake. When included in a recipe, this will create an [Key Vault](https://azure.microsoft.com/en-us/services/key-vault/).

## Usage

```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-key-vault@~0"
resourceGroup: true
recipe:
  keyvault:
    properties:
      type: "@azbake/ingredient-key-vault"
      parameters:
        name: "[keyvaultutils.create_resource_name()]"       
        sku: "standard"                      
        networkAcls:
          defaultAction: "Deny"
          bypass: "AzureServices"
          ipRules: []
          virtualNetworkRules: []
```

| property | required | description |
| -------- | -------- | ----------- |
| name | yes | The name for the Key Vault |
| location | no | Sets the location. Defaults to the parent resource group location. |
| sku | yes | SKU for the vault |
| accessPolicies | no | The access policies defined for this vault |
| tenant | no | Specifies the Azure Active Directory tenant ID that should be used for authenticating requests to the key vault |
| enabledForDeployment | no | Boolean flag to specify whether Azure Virtual Machines are permitted to retrieve certificates stored as secrets from the key vault. Default value is false |
| enabledForTemplateDeployment | no | Boolean flag to specify whether Azure Resource Manager is permitted to retrieve secrets from the key vault. Default value is false |
| enabledForDiskEncryption | no | Boolean flag to specify whether Azure Disk Encryption is permitted to retrieve secrets from the vault and unwrap keys. Default value is false |
## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``keyvalut`` class

| function | description |
| `create_resource_name()` | Returns the name created for the Key Vault when deployed |

### Function Details

#### create_resource_name()

Gets the name created for the Key Vault when deployed.

```yaml
...
parameters:
    name: "[keyvaultutils.create_resource_name()]"
...
```

##### Returns

string