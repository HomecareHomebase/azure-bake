## Changelogs
* [@azbake/ingredient-traffic-manager](./CHANGELOG.md)

## Overview

The Traffic Manager ingredient is a plugin for Bake.  When included in a recipe, this plugin will install a global instance of traffic manager in the primary region (first region in the list) for your environment.  It will then create an endpoint for each region deployed and add it to the global profile.

## Usage

Because endpoints are created dynamically during each region, you should not use the parallel regions feature of bake.  Set this to false in your receipe's bake.yaml to ensure the global profile and other dependencies are created before adding an endpoint.

### Recipe
```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-traffic-manager@~0"
parallelRegions: false
resourceGroup: true
recipe:
  mypkg-traffic-mgr:
    properties:
      type: "@azbake/ingredient-traffic-manager"
      source: "[webapp.get_resource_profile()]"
      parameters:
        source-type: "Microsoft.Web/sites/"
```


| property|required|description|
|---------|--------|-----------|
|source|yes|the source of the endpoint being created in format ``<resourceGroup>/<resource>`` ***|
|source-type|yes|the type of the azure resource used for the endpoint|
|routing-method|no (default Performance)|routing method of the traffic manager profile|
|interval|no (default 10)|number of seconds to ping the endpoint for availability|
|protocol|no (default HTTPS)|protocol used for health checks|
|port|no (default 443)|port used for health checks|
|ttl|no (default 10)|number of seconds the DNS entries are kept|
|path|no (default /)|path on the endpoint to check|
|number-of-failures|no (default 3)|number of times to retry before marking an endpoint down|
|timeout|no (default 5)|number of seconds to wait for a response from the endpoint|

***  Please note that you can supply just the name of the azure resource for the source if the resource exists within the same resource group that is currently being deployed for traffic manager.

*** Please note that all values should be in the parameters section of the recipe except for source

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``traffic`` class

|function|description|
|--------|-----------|
|get_profile()| Returns the name created for the traffic manager profile when deployed.|

### Function Details

#### get_profile()
Gets the name create for the traffic manager profile deployed.  This value when appended to ``.trafficmanager.net`` will give you the url to access the resouce.

```yaml
...
parameters:
    trafficmanagername: "[traffic.get_profile()]"
...
```

#### Returns
string


