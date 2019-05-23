## Changelogs
* [@azbake/ingredient-app-insights](./CHANGELOG.md)

## Overview

The Application Insights ingredient is a plugin for Bake.  When included in a recipe, this plugin will install a instance of an Application Insights resource.  A region parameter is provided to allow for a deployment to a specific region.  The Smart Detection settings within the arm.json ARM template will turn off the default email notification but still leave the Smart Detection alerts enabled.  Also, the naming convention for the _Failure Anomalies_ alert is very specific and a duplicate alert may result if it is modified.  Lastly, Microsoft is deprecating Smart Detection settings so this will be updated as needed once that occurs.

## Usage

### Recipe for creating a resource
```yaml
name: Deploys all Application Insights resources
#shortName will be a component of the resource group name.  ie <env><shortName> --> prodappinsights
shortName: appinsights
version: 0.0.2
ingredients:
  - "@azbake/ingredient-app-insights@~0"
resourceGroup: true
recipe:
  appinsights-property:
    properties:
      type: "@azbake/ingredient-app-insights"
      source: ""
      parameters:
        #App Insights resource name
        appInsightsName: "[appinsights.get_resource_name('property')]"
        #App Insights region.
        appInsightsLocation: "East US"
  appinsights-payroll:
    properties:
      type: "@azbake/ingredient-app-insights"
      source: ""
      parameters:
        #App Insights resource name
        appInsightsName: "[appinsights.get_resource_name('payroll')]"
        #App Insights region.
        appInsightsLocation: "East US"
```

### Recipe for referencing a resource
```yaml
name: Deploys all Application Insights resources
#shortName will be a component of the resource group name.  ie <env><shortName> --> prodappinsights
shortName: propertywebappcontainer
version: 0.0.2
ingredients:
  - "@azbake/ingredient-webapp-container@~0"
  - "@azbake/ingredient-app-insights@~0"
resourceGroup: true
recipe:
  mypkg-web-site:
    properties:
      type: "@azbake/ingredient-webapp-container"
      source: "[coreutils.get_app_svc_name('ngapp')]"
      tokens:
        BASE_URL: "[coreutils.variable('svc_base_url')]"
        PROPERTY: "some value"
        APPINSIGHTS_INSTRUMENTATIONKEY: "[appinsights.get_instrumentation_key('property','appinsights')]"
      parameters:
        container_image_name: "myregistry.azurecr.io/mypkg:latest"
        container_registry_url: "[coreutils.variable('container_registry_url')]"
        container_registry_user: "[coreutils.variable('container_registry_user')]"
        container_registry_password: "[coreutils.variable('container_registry_password')]"
```

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``appinsights`` class

|function|description|
|--------|-----------|
|get_resource_name()|Gets a full App Insights resource name. |
|get_instrumentation_key()|Gets an App Insights instrumentation key.|

### Function Details

#### get_resource_name()
Gets an full App Insights resource name by passing a short name. Returns in the format
``<environment_name>ai<shortname>``.  For example, ``prodaipayroll``.

```yaml
...
parameters:
  appInsightsName: "[appinsights.get_resource_name('payroll')]"
...
```
#### Returns
string

#### get_instrumentation_key()
Gets an App Insights instrumentation key by passing a short name and resource group short name.

This is useful inside of a recipe when another ingredient needs to reference an App Insights resource deployed in a different recipe.  In the example below, the instrumentation key is returned from an App Insights resource named <env>aiproperty that's in a resource group named <env>appinsights.

```yaml
...
      tokens:
        APPINSIGHTS_INSTRUMENTATIONKEY: "[appinsights.get_instrumentation_key('property','appinsights')]"
...
```

#### Returns
string