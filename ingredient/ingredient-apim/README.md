## Changelogs

* [@azbake/ingredient-apim](./CHANGELOG.md)

## Overview

The APIM ingredient allows for easy registration & modification of APIs, Products, and Subscriptions within an Azure APIM resource.

## Usage

Typical use-case for APIM is to have a single master resource and use secondary regions that sync against the master data. If you are using this use-case you should configure the ingredient instance with a condition of **"[coreutils.primary_region()]"** so that it only deploys into your primary bake region configuration. Otherwise, the same data will deploy into every apim instance if you have multiple regions.

### Ingredient Name

*@azbake/ingredient-apim*

### How to include in a recipe

```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-apim@~0" #include the latest version of the ingredient at build time
parallelRegions: false #typically we only want to deploy to the primary region, so can turn off parallel deploy
resourceGroup: false #If the recipe only contains an apim api deployment, you don't need to create resource groups
```

### How to use as an ingredient instance
```yaml
recipe:
  pet-api-deploy:
    properties:
      type: "@azbake/ingredient-apim" #ingredient type
      source: "<azure_resource_group_name>/<azure_apim_resource_name>" #identity the azure apim resource to register an API against
      condition: "[coreutils.primary_region()]" #make sure we only execute this against the primary region for multi-region configs
      parameters:
        ... #see documentation below on parameter documentation for how to use.
```

## Parameters

Here is the documentation for all the supported paremeters for this ingredient.

**options**
```yaml
options:
  apiWaitSeconds: <number> # Supply a number of seconds to wait for any xml-link/swagger-link urls to become availabile 
                           # before creating the APIM api/policy/etc.
                           # You might be deploying a new API in this recipe, which could take 30-120s to become online.
                           # This setting lets us wait for new APIs to be online before APIM
```

**apis**
```yaml
apis: #apis is a list of ApiVersionSchemas
  - id: <api-version-id> #unique id for the API (version set)
    data: #data follows this azure spec for *ApiVersionSetContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L1460
    versions:
      - versionSchema #See next section for version schema
```

**api.versions**
```yaml
versions:
  - id: <api-id> #typically you want set the id to <api-version-id>-<version> to keep the id consistant for the version set it belongs to
    version: <string> #version string that will be used as part of the above ApiVersionSetContract.versioningSchema     
    data: #scheme follows this azure spec for *ApiCreateOrUpdateParameter* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L1310
    policies: #see next section for policy schema
```
*Note: **ApiCreateOrUpdateParameter.serviceUrl** and **ApiCreateOrUpdateParameter.value** support being defined as BakeVariables. This allows you to set these two values as an expression to resolve endpoint/data dynamically during deployment*

**api.versions.[n].policies**
```yaml
policies:
  - operation: <string> #optional, and if not set this will be the default policy set for the entire api. Otherwise, name of an operation within this api to apply the policy to.
    data: #scheme follows this azure spec for *PolicyContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L797
```

**products**
```yaml
products:
 - id: <string> #unique product id
   data: #schema follows this azure spec for *ProductContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L826
   apis: <list of strings> # list of api-ids that should be assigned to the product (use individual versioned ids, not the version set)
   groups: <list of strings> #list of group names that have access to the product
   policy: #scheme follows this azure spec for *PolicyContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L797
   subscriptions: #See below for schema
```

**products.[n].subscriptions**
```yaml
subscriptions:
  - id: <string> #unique subscription id for the entire apim resource
    user: <string> #optional username that owns the subscription, defaults to Administrator
```

## Sample
```yaml
name: apim-test
shortName: apimtest
version: 1.0.0
ingredients:
  - "@azbake/ingredient-apim@~0"
resourceGroup: false
parallelRegions: false
variables:  
  url: http://petstore.swagger.io/v2/swagger.json
recipe:
  petstore-api:
    properties:
      type: "@azbake/ingredient-apim"
      source: myRg/myApim
      condition: "[coreutils.primary_region()]"
      parameters:
        options:
          apiWaitSeconds: 60 #override to waiting up to 60s for the API to be ready
        apis:
          - id: petstore #unique API version identifier across APIM
            data:
              displayName: Pet Store API
              versioningScheme: Segment
            versions:
              - id: petstore-v1 # unique API identifer across APIM
                version: v1
                data:
                  apiType: http
                  path: pets #base apim url for this api
                  protocols: #array of http and/or https
                    - https
                  format: swagger-link-json #using a swagger link the value needs to be a http based json document to download
                  value: "[coreutils.variable('url')]" #value supports bake variables.
                policies: 
                  - data: #this policy does not set the operation, so will default to the entire API (operation: base does the same thing)
                      format: xml #we use a non-link format here to embed the policy, but this could have been xml-link and a http address
                      value: "<policies> <inbound /> <backend>    <forward-request />  </backend>  <outbound /></policies>"
                  - operation: addPet #override the addPet operation policy
                    data:
                      format: xml
                      value: "<policies> <inbound /> <backend>    </backend>  <outbound /></policies>"
              - id: petstore-v2 # unique API identifer across APIM
                version: v2
                data:
                  apiType: http #unless you're using soap
                  path: pets #base apim url for this api
                  protocols: #array of http and/or https
                    - https
                  format: swagger-link-json #using a swagger link the value needs to be a http based json document to download
                  value: "[coreutils.variable('url')]" #value supports bake variables.
                policies:
                  - data: #this policy does not set the operation, so will default to the entire API (operation: base does the same thing)
                      format: xml #we use a non-link format here to embed the policy, but this could have been xml-link and a http address
                      value: "<policies> <inbound /> <backend>    <forward-request />  </backend>  <outbound /></policies>"
                  - operation: addPet #override the addPet operation policy
                    data:
                      format: xml
                      value: "<policies> <inbound /> <backend>    </backend>  <outbound /></policies>"        
        products:
          - id: petstore-product
            data:
              displayName: My Petstore
              description: My Petstore Description
              terms: My terms
              subscriptionRequired: true
              approvalRequired: true
              state: published
            apis:
              - petstore-v1
              - petstore-v2
            groups:
              - Administrators
              - Developers
            subscriptions:
              - id: petstore-subscription
                user: Administrator
```

## Utility Functions
This ingredient includes a utility helper for accessing subscriptions that have already been created

```yaml
variables:
  primary_key:  "[apim.get_subscription_key('myRg', 'myApim', 'petstore-subscription')]"
  secondary_key:  "[apim.get_subscription_keySecondary('myRg', 'myApim', 'petstore-subscription')]"
```