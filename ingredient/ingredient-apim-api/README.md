## Changelogs

* [@azbake/ingredient-apim-api](./CHANGELOG.md)
 
## Overview

The APIM API ingredient allows for easy registration & modification of APIs within an Azure APIM resource.

## Usage

Typical use-case for APIM is to have a single master resource and use secondary regions that sync against the master data. If you are using this use-case you should configure the ingredient instance with a condition of **"[coreutils.primary_region()]"** so that it only deploys into your primary bake region configuration. Otherwise, the same data will deploy into every apim instance if you have multiple regions.

### Ingredient Name

*@azbake/ingredient-apim-api*

### How to include in a recipe

```yaml
name: My package
shortName: mypkg
version: 0.0.1
ingredients:
  - "@azbake/ingredient-apim-api@~0" #include the latest version of the ingredient at build time
parallelRegions: false #typically we only want to deploy to the primary region, so can turn off parallel deploy
resourceGroup: false #If the recipe only contains an apim api deployment, you don't need to create resource groups
```

### How to use as an ingredient instance
```yaml
recipe:
  apim-api-deploy:
    properties:
      type: "@azbake/ingredient-apim-api" #ingredient type
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
                           # This setting lets us wait for new APIs to be online
```

**apis**

```yaml
apis: #follows this azure spec for *ApiVersionSetContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L1460
  - name: <api-version-name> #unique id for the API (version set) - required
    versions:
      - versionSchema #See next section for version schema
```

**api[n].versions**

```yaml
versions: #follows this azure spec for *ApiCreateOrUpdateParameter* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L1310
  - name: <api-name> #typically you want set the id to <api-version-id>-<version> to keep the id consistant for the version set it belongs to - required
    version: <string> #version string that will be used as part of the above ApiVersionSetContract.versioningSchema      
    products: #optional list of product names to assign API to
    policies: #see next section for policy schema
    diagnostics: #see next section for diagnostic schema
```

*Note: **ApiCreateOrUpdateParameter.serviceUrl** and **ApiCreateOrUpdateParameter.value** support being defined as BakeVariables. This allows you to set these two values as an expression to resolve endpoint/data dynamically during deployment*

**api.versions[n].policies**

```yaml
policies: #scheme follows this azure spec for *PolicyContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L797
  - operation: <string> #optional, and if not set this will be the default policy set for the entire api. Otherwise, name of an operation within this api to apply the policy to.
```

**api.versions[n].diagnostics**

```yaml
diagnostics: #scheme follows this azure spec for *PolicyContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L727
  - name: <type of diagnostic> #required name of the diagnostic
```

## Utility Functions

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``apimapi`` class

| Function | Returns | Description |
|----------|---------|-------------|
| `get_api(resourceGroup: string, apimName: string, apiId: string)` | `Promise<ApiGetResponse>` | Returns the API for a given set of parameters. |
| `get_backend(resourceGroup: string, apimName: string, backendId: string)` | `Promise<BackendGetResponse>` | Returns the back end for a given set of parameters. |

### Utility function examples
```yaml
variables:
  api: "[await apimapi.get_api(<apim resource group>, <apim name>, <api id>)]"
  backend: "[await apimapi.get_backend(<apim resource group>, <apim name>, <backend id>)]"
```

## Sample

```yaml
name: my-api
shortName: myApi
owner: owner
version: 1.0.0
ingredients:
  - "@azbake/ingredient-apim-api@~0"
  - "@azbake/ingredient-app-insights@~0"
resourceGroup: false #no need to create a resource group, just assigning to existing APIM instance
parallelRegions: false
variables:  
  url: http://petstore.swagger.io/v2/swagger.json
  aiName: "[appinsights.get_resource_name('apim-api')]"
  apimName: "[apim.get_resource_name('api')]"
  apimResourceGroup: "[apim.get_resource_group()]"
  # build the source from helper functions
  apimSource: "[apim.get_resource_group() + '/' + apim.get_resource_name('api')]"
recipe:
  my-api-deploy:
    properties:
      type: "@azbake/ingredient-apim-api"
      source: "[coreutils.variable('apimSource')]" #point to existing APIM resource to add API
      condition: "[coreutils.primary_region()]"
      parameters:
        options:
          apiWaitTime: 60 #override to waiting up to 60s for the API to be ready
        apis:
          - name: petstore #unique API version identifier across APIM
            displayName: Pet Store API
            description: Pet Store API description
            versioningScheme: Segment
            versions:
              - name: petstore-v1 # unique API identifer across APIM
                version: v1
                apiType: http
                path: pets #base apim url for this api
                protocols: #array of http and/or https
                  - https
                format: swagger-link-json #using a swagger link the value needs to be a http based json document to download
                value: "[coreutils.variable('url')]" #value supports bake variables.
                products:
                  - petstore-product #product should already be created.  if needed you can import APIM ingredient and deploy in the same recipe
                  - starter
                policies: 
                  - format: xml #we use a non-link format here to embed the policy, but this could have been xml-link and a http address
                    value: <policies>
                              <inbound /> 
                              <backend>    
                                <forward-request /> 
                              </backend>  
                              <outbound>
                                <set-header name="X-Powered-By" exists-action="delete" />
                                <set-header name="X-AspNet-Version" exists-action="delete" />
                                <set-header name="CustomHeader" exists-action="override">
                                  <value>{{expressionApiDisplay}}</value>
                                </set-header>
                              </outbound>
                            </policies>
                  - operation: addPet #override the addPet operation policy
                    format: xml
                    value: "<policies> <inbound /> <backend>    </backend>  <outbound /></policies>"
                diagnostics:
                  - name: applicationinsights
                    loggerId: "[(await apim.get_logger(await coreutils.variable('apimResourceGroup'), await coreutils.variable('apimName'), 'aiapim-api')).id]"
                    sampling:
                      samplingType: fixed
                      percentage: 50
              - name: petstore-v2 # unique API identifer across APIM
                version: v2
                apiType: http #unless you're using soap
                path: pets #base apim url for this api
                protocols: #array of http and/or https
                  - https
                format: swagger-link-json #using a swagger link the value needs to be a http based json document to download
                value: "[coreutils.variable('url')]" #value supports bake variables.
                products:
                  - petstore-product
                policies:
                  - format: xml #we use a non-link format here to embed the policy, but this could have been xml-link and a http address
                    value: <policies>
                              <inbound /> 
                              <backend>    
                                <forward-request /> 
                              </backend>  
                              <outbound>
                                <set-header name="X-Powered-By" exists-action="delete" />
                                <set-header name="X-AspNet-Version" exists-action="delete" />
                              </outbound>
                            </policies>
                  - operation: addPet #override the addPet operation policy
                    format: xml
                    value: "<policies> <inbound /> <backend>    </backend>  <outbound /></policies>"
```