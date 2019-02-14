## Changelogs
* [@azbake/ingredient-host-names](./CHANGELOG.md)

## Overview

The host names ingredient is a plugin for bake.  When included in a recipe, this plugin will install vanity host names for your web app, and secure it with a certificate of your choice from key vault.

Before deploying a custom host name with ssl binding, be sure that your custom domain has been configured to route traffic to the azure website.

This ingredient assumes that you already have a key vault configured with your ssl cert uploaded.  The "Microsoft Azure App Service" must have "Get" permissions for secrets in the keyvault in order for the deployment to read and use the certificate.  You can accomplish this with the following powershell, or the portal:

```powershell
Set-AzureRMKeyVaultAccessPolicy -VaultName myenvkvtest -ServicePrincipalName abfa0a7c-a6b6-4736-8310-5855508787cd -PermissionsToSecrets get
```

Note that the serviceprincipal name / id in the above statement is global across all of Azure.

## Usage

### Recipe
```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-host-names@~0"
resourceGroup: true
recipe:
  mypkg-ssl:
    properties:
      type: "@azbake/ingredient-host-names"
      source: "appsvc_resourceGroup/appsvc_name"
      parameters:
        keyvault: "kv_resourceGroup/keyvault_name"
        certificate: "MyCertificate"
```


|property|required|description|
|---------|--------|-----------|
|source|yes|The app service plan you wish to add the certificate to.  Format ``<resourceGroup>/<resource>`` ***|
|keyvault|yes|The key vault used to hold the ssl certificate for the host name.  Format ``<resourceGroup>/<resource>`` ***|
|certificate|yes|The name of the ssl certificate to use in key vault|
|hostname|yes|The url of custom domain being added|

***  Please note that you can supply just the name of the azure resource for the source if the resource exists within the same resource group that is currently being deployed for traffic manager.

*** Please note that all values should be in the parameters section of the recipe except for source
