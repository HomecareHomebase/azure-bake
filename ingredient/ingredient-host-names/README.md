## Changelogs
* [@azbake/ingredient-host-names](./CHANGELOG.md)

## Overview

The host names ingredient is a plugin for bake.  When included in a recipe, this plugin will install vanity host names for your web app, and secure it with a certificate of your choice from your app svc plan.

Before deploying a custom host name with ssl binding, be sure that your custom domain has been configured to route traffic to the azure website.

This ingredient assumes that you already have a key vault configured with your ssl cert uploaded and associated to the app service plan.

Please note when setting up your keyvault and app svc plan, that the "Microsoft Azure App Service" must have "Get" permissions for secrets in the keyvault in order for the deployment to read and use the certificate.  You can accomplish this with the following powershell, or the portal:

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
      source: "mysite.mydomain.com"
      parameters:
        certificate: "certificate_resourceGroup/certificate_name"
```


|property|required|description|
|---------|--------|-----------|
|source|yes|The url of custom domain being added|
|certificate|yes|The name of the ssl certificate to use in key vault. Format ``<resourceGroup>/<resource>`` ***|

***  Please note that you can supply just the name of the azure resource for the source if the resource exists within the same resource group that is currently being deployed for traffic manager.

*** Please note that all values should be in the parameters section of the recipe except for source
