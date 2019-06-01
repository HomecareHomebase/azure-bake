## Changelogs
* [@azbake/ingredient-function-app](./CHANGELOG.md)

## Overview

The Function App ingredient is a plugin for Bake. When included in a recipe, this will create a standard function app for organizing a number of Azure Functions. This ingredient depends on a hosting plan, a Storage account, and an Application Insights resource to be provisioned already, and the names of these resources must be included in the recipe.

## Usage

### Recipe
```yaml
name: My package
shortName: mypkg
version: 1.0.0
ingredients:
  - "@azbake/ingredient-function-app@~0"
resourceGroup: true
rgOverride: "resourcegroup1"
parallelRegions: false
recipe:
  funcapp:
    properties:
      type: "@azbake/ingredient-function-app"
      parameters:
        appName: "[functionapputils.create_resource_name()]"
        planName: "hostingplan2"
        storageAccountName: "storageaccount3"
        appInsightsName: "appInsights4"
```

| property|required|description|
|---------|--------|-----------|
| appName | yes | Name for the function app resource |
| planName | yes | Specifies the hosting plan to use for this function app. |
| storageAccountName | yes | The Storage account to use. It should be able to support the Always On feature for function apps |
| appInsightsName | yes | The Application Insights resource that this function app will report to |
| location | no |The location for this resource. Default is the parent resource group geographic location |

For hosting plan, storage account, or application insights, indicate the the resource groups they belong to if the function app will be in a different group. Use the following format to specify resource groups. If a resource group is not indicated, it will look for the resources in the same group that the function app is targeting.  
``<resource_group>/<resource_name>``

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``functionapputils`` class

|function|description|
|--------|-----------|
|create_resource_name()| Creates a name for the function app in the format ``<environment_name><region_code>fa<pkg_shortname>``.|

### Function Details

#### create_resource_name()
Creates a name for the function app in the format ``<environment_name><region_code>fa<pkg_shortname>``

```yaml
...
parameters:
  appName: "[functionapputils.create_resource_name()]"
...
```
#### Returns
string