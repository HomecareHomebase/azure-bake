## Changelogs
* [@azbake/ingredient-webapp-container](./CHANGELOG.md)

## Overview

The Web App ingredient is a plugin for Bake.  When included in a recipe, this plugin will install a instance of an azure Web App for Containers.  An instance of the web app will be included with each region specified in your environment.  This ingredient only supports deployment of a web site inside of a linux based docker container.

This ingredient does not deploy an instance of an app service plan, and expects that a linux based app service plan has already been created for the app.

## Usage

### Recipe
```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-webapp-container@~0"
resourceGroup: true
recipe:
  mypkg-web-site:
    properties:
      type: "@azbake/ingredient-webapp-container"
      source: "[coreutils.get_app_svc_name('ngapp')]"
      parameters:
        container_image_name: "myregistry.azurecr.io/mypkg:latest"
        container_registry_url: "[coreutils.variable('container_registry_url')]"
        container_registry_user: "[coreutils.variable('container_registry_user')]"
        container_registry_password: "[coreutils.variable('container_registry_password')]"
```


|property|required|description|
|---------|--------|-----------|
|source|yes|the linux based app service plan used to host this website.  Format ``<resourceGroup>/<resource>`` ***|
|container_image_name|yes|The name of the image to be deployed to web app.|
|container_registry_url|yes|The url to the container registry containing your image|
|container_registry_user|yes|the user name with access to pull images from the registry|
|container_registry_password|yes|the password for the user specified with access to the registry|

***  Please note that you can supply just the name of the azure resource for the source if the resource exists within the same resource group that is currently being deployed for traffic manager.

*** Please note that all values should be in the parameters section of the recipe except for source

### Best Practices
Since there is some secure information required to deploy your web site in a container, it si recommended that this information should be stored inside of the environment and referenced through ``coreutils.variable()``.  Do not set these values in the recipe itself as it could risk exposing this information publicly. Sample above uses this method to keep secure user credentials and password for the container registry.

## Utilities

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``webapp`` class

|function|description|
|--------|-----------|
|create_profile()|Gets or creates the profile name used to deploy the web app|
|get_resource_profile()|Gets the resource group and web app name in the format ``<resourceGroup>/<resource>``.|

### Function Details

#### create_profile()
Gets or creates the name of the web app in the format ``<environment_name><region_code>webapp<pkg_shortname>``

```yaml
...
parameters:
  appName: "[webapp.create_profile()]"
...
```
#### Returns
string

#### get_resource_profile()
Gets the resource group and web app profile name as a single string in the format ``<resourceGroup>/<resource>``

This is useful inside of a recipe when another ingredient needs to reference the web application deployed with this ingredient (such as a traffic manager endpoint)

```yaml
...
source: "[webapp.get_resource_profile()]"
...
```

#### Returns
string - Formatted as ``<resourceGroup>/<resource>``
