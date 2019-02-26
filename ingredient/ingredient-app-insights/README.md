## Changelogs
* [@azbake/ingredient-app-insights](./CHANGELOG.md)

## Overview

The Application Insights ingredient is a plugin for Bake.  When included in a recipe, this plugin will install a instance of an Application Insights resource.  A region parameter is provided to allow for a deployment to a specific region.  The Smart Detection settings within the arm.json ARM template will turn off the default email notification but still leave the Smart Detection alerts enabled.  Also, the naming convention for the _Failure Anomalies_ alert is very specific and a duplicate alert may result if it is modified.  Lastly, Microsoft is deprecating Smart Detection settings so this will be updated as needed once that occurs.

## Usage

### Recipe
```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-app-insights@~0"
resourceGroup: true
recipe:
  mypkg-web-site:
    properties:
      type: "@azbake/ingredient-app-insights"
      source: ""
      parameters:
        ##App Insights resource name
        appInsightsName: "AppInsightsResourceName"
        ##App Insights region.
        appInsightsLocation: "East US"
```
