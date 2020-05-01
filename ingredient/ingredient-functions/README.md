## Changelogs
* [@azbake/ingredient-functions](./CHANGELOG.md)

## Overview

The Functions ingredient is a plugin for Bake.  When included in a recipe, this plugin will install an instance of a Function App on Linux inside a Linux-based Docker container. 

This ingredient does not deploy an instance of an App Service plan and expects that a Linux-based App Service plan has already been created for the app. It also does not create Storage Account and Application Insights resources and expects them to be deployed prior to deploying the Function App.

## Usage

### Recipe
```yaml
name: functions deployment
shortName: funcdepl
version: 0.1.0
ingredients:
  - "@azbake/ingredient-app-insights@~0"
  - "@azbake/ingredient-functions@~0"
resourceGroup: true
#rgOverride: "" 
variables:
  funcAppResourceGroup:  func-apps-test-rg
  storageAccountConnectionString: DefaultEndpointsProtocol=https;AccountName=funcappsstorageaccount;AccountKey=***;EndpointSuffix=core.windows.net
  hostingPlanName: func-apps-app-service-plan
  hostingEnvironment: func-apps-test-rg-hosting-environment
recipe:
  functions:
    properties:
      type: "@azbake/ingredient-functions"
      source: ./arm.json
      parameters:
        funcAppName: hello-docker-function-1
        funcAppResourceGroup: "[coreutils.variable('funcAppResourceGroup')]"
        storageAccountConnectionString: "[coreutils.variable('storageAccountConnectionString')]"
        container_registry_url: "[coreutils.variable('container_registry_url')]"
        container_registry_user: "[coreutils.variable('container_registry_user')]"
        container_registry_password: "[coreutils.variable('container_registry_password')]"
        container_image_name: func-apps-test/hello-docker-functions:latest
        hostingPlanName: "[coreutils.variable('hostingPlanName')]"
        location: East US
        hostingEnvironment: "[coreutils.variable('hostingEnvironment')]"
        appInsightsKey: "[appinsights.get_instrumentation_key('hellodockerfunctions','appinsights')]"
```


|property|required|description|
|---------|--------|-----------|
| funcAppName | Yes | Unique name of the function app to create or update. |
| funcAppResourceGroup | No | App Service resource group. If not set, it defaults to the resource group of the Bake deployment context. |
| storageAccountConnectionString | Yes | Connection string of the storage account. |
| container_registry_url | Yes | Docker container registry address. |
| container_registry_user | Yes** | Docker container registry user name. |
| container_registry_password | Yes** | Docker container registry password. |
| container_image_name | Yes | Name of the Linux-based Docker image to deploy. This image should contain the function app artifacts. |
| hostingPlanName | Yes | Name of the App Service hosting plan. |
| location | Yes | Resource location. |
| hostingEnvironment | Yes | App Service environment to use for the function app. |
| appInsightsKey | Yes | Application Insights instrumentation key. |

** Not required for public repositories.



### Best Practices
Since there is some secure information required to deploy your web site in a container, it is recommended that this information should be stored inside of the environment and referenced through ``coreutils.variable()``.  Do not set these values in the recipe itself as it could risk exposing this information publicly. Sample above uses this method to keep secure user credentials and password for the container registry.


## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``functions`` class

|function|description|
|--------|-----------|
|create_resource_name(shortName)|Creates the full function app name by passing a short name.|

#### Function Details

#### create_resource_name(shortName)
Creates the full function app name in the format ``<environment_name>fa<shortname>``

```yaml
...
parameters:
  funcAppName: "[functions.create_resource_name('hello-docker-function-1')]"
...
```
#### Returns
string

