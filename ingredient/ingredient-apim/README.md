## Changelogs

* [@azbake/ingredient-apim](./CHANGELOG.md)

## Overview

The APIM ingredient allows for easy standup of a [Windows API Management API](https://docs.microsoft.com/en-us/azure/api-management/api-management-key-concepts) instance including creation/modification of Products, Subscriptions and more.

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
resourceGroup: true #Create a resource group for the APIM resource
```

### How to use as an ingredient instance

```yaml
recipe:
  apim-deploy:
    properties:
      type: "@azbake/ingredient-apim" #ingredient type
      condition: "[coreutils.primary_region()]" #make sure we only execute this against the primary region for multi-region configs
      parameters:
        ... #see documentation below on parameter documentation for how to use.
```

## Parameters

Here is the documentation for all the supported paremeters for this ingredient.

**apimService**

```yaml
apimService: #follows this azure spec for *ApiManagementServiceResource* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L2451
  - apimServiceName: <apim name>
```

**diagnostics**

```yaml
diagnostics: #follows this azure spec for *DiagnosticSettingsResource* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/monitor/arm-monitor/src/models/index.ts#L991
  - name: <diagnostics name>
```

**namedValues**

```yaml
namedValues: #follows this azure spec for *PropertyContract * : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L3769
  - id: <named value id>
```

**groups**

```yaml
groups: #follows this azure spec for *GroupCreateParameters * : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L3088
  - id: <group id>
```

**users**

```yaml
users: #follows this azure spec for *UserCreateParameters * : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L4387
  - id: <user id>
```

**products**

```yaml
products: #follows this azure spec for *ProductContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L826
  - id: <product id>
    apis: #optional array of api names to add to product
      - api1
    groups: #optional array of groups to assign to product
      - group1
    policy: #optional policy for prduct.  follows asure spec for *PolicyContract*: https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L797
    subscriptions: #optional array of subscriptions to add to product
      - sub1
```

**loggers**

```yaml #follows this azure spec for *LoggerContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L3261
loggers:
  - appInsightsName: <app insights name>
    cleanKeys: true # clean the old subscription keys
```

**authServers**

```yaml
authServers: #follows this azure spec for *AuthorizationServerContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L1641
  - id: <auth servier id>
```

**identityProviders**

```yaml
identityProviders: #follows this azure spec for *IdentityProviderContract* : https://github.com/Azure/azure-sdk-for-js/blob/20fe312b1122b21811f9364e3d95fe77202e6466/sdk/apimanagement/arm-apimanagement/src/models/index.ts#L3193
  - id: <identity provider id>
```

## Utility Functions

Utility classes can be used inside of the bake.yaml file for parameter and source values.

### ``apim`` class

| Function | Returns | Description |
|----------|---------|-------------|
| `get_resource_name(name: string | null = null)` | `string` | Gets a standard resource name for an APIM instance |
| `get_resource_group(name: string = "apim")` | `string` | Gets a standard resource group for an APIM instance |
| `get_subnet(resourceGroup: string, vnetName: string, subnetName: string)` | `Promise<SubnetsGetResponse>` | Returns the subnet for a given set of parameters. |
| `get_logger(resourceGroup: string, apimName: string, loggerId: string)` | `Promise<LoggerGetResponse>` | Returns the logger for a given set of parameters. |
| `get_storageaccount(resourceGroup: string, name: string)` | `Promise<StorageAccountGetPropertiesResponse>` | Returns the storage account for a given set of parameters. |
| `get_namedValue(resourceGroup: string, apimName: string, namedValueId: string)` | `Promise<PropertyGetResponse>` | Returns the named value (property) for a given set of parameters. |
| `get_api(resourceGroup: string, apimName: string, apiId: string)` | `Promise<ApiGetResponse>` | Returns the API for a given set of parameters. |
| `get_backend(resourceGroup: string, apimName: string, backendId: string)` | `Promise<BackendGetResponse>` | Returns the back end for a given set of parameters. |
| `get_subscription(resourceGroup: string, resource: string, subscriptionId: string)` | `Promise<SubscriptionGetResponse>` | Returns the subscription for a given set of parameters. |
| `get_subscription_key(resourceGroup: string, resource: string, subscriptionId: string)` | `Promise<string>` | Returns the subscription key for a given set of parameters. |
| `get_subscription_keySecondary(resourceGroup: string, resource: string, subscriptionId: string)` | `Promise<string>` | Returns the subscription secondary key for a given set of parameters. |

### Utility function examples
```yaml
rgOverride: "[apim.get_resource_group()]"
variables:
  apimName: "[apim.get_resource_name(<name>)]"
  subnetResource: "[await apim.get_subnet(<vnet resource Group>, <vnet name>, <subnet name>)]"
  logger: "[await apim.get_logger(<apim resource group>, <apim name>, <logger name>)]"
  storageAccount: "[await apim.get_storageaccount(<storage account resource group>, <storage account name>)]"
  namedValue: "[await apim.get_namedValue(<apim resource group>, <apim name>, <named value id>)]"
  api: "[await apim.get_api(<apim resource group>, <apim name>, <api id>)]"
  backend: "[await apim.get_backend(<apim resource group>, <apim name>, <backend id>)]"
  subscription: "[await apim.get_subscription(<apim resource group>, <apim name>, <subscription id>)]"
  subscriptionKey: "[await apim.get_subscription_key(<apim resource group>, <apim name>, <subscription id>)]"
  subscriptionKeySecondary: "[await apim.get_subscription_keySecondary(<apim resource group>, <apim name>, <subscription id>)]"
```

## Sample

```yaml
name: apim
shortName: apim
owner: arch
version: 1.0.0
ingredients:
  - "@azbake/ingredient-apim@~0"
  - "@azbake/ingredient-app-insights@~0" #use app insights ingredient to create ai resource for diagnostics
resourceGroup: true
parallelRegions: false
rgOverride: "[apim.get_resource_group()]"
variables:
  aiName: "[appinsights.get_resource_name('apim-api')]"
  aiKey: "[await appinsights.get_instrumentation_key('apim-api','appinsights', true)]"
  aiResourceGroup: "[coreutils.resource_group('appinsights', false, null, true)]"
  apimName: "[apim.get_resource_name('api')]"
recipe:
  apim-app-insights-deploy: 
    properties:
      type: "@azbake/ingredient-app-insights"
      source: ""
      condition: "[coreutils.current_region_primary()]"
      parameters:
        #App Insights resource name in the format env + resource type + resource short name.  ie devaiinterop
        appInsightsName: "[coreutils.variable('aiName')]"
        rgOverride: "[coreutils.variable('aiResourceGroup')]"
  apim-deploy:
    properties:
      dependsOn: apim-app-insights-deploy
      type: "@azbake/ingredient-apim"
      condition: "[coreutils.primary_region()]"
      parameters:
        apimService:
          apimServiceName: "[coreutils.variable('apimName')]"
          location: "[coreutils.current_region().name]"
          publisherEmail: joesmith@contoso.com
          publisherName: Joe Smith
          sku:
            name: Developer
            capacity: 1
          enableClientCertificate: true
          customProperties:
            Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls10: "false"
            Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Tls11: "false"
            Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Ciphers.TripleDes168: "false"
            Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Protocols.Ssl30: "false"
            Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls10: "false"
            Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Tls11: "false"
            Microsoft.WindowsAzure.ApiManagement.Gateway.Security.Backend.Protocols.Ssl30: "false"
          virtualNetworkType: External
          virtualNetworkConfiguration:
            subnetResourceId: "[(await apim.get_subnet('RG_VNET_TEST', 'vnettest', 'default')).id]"
        diagnostics:
          name: diagSettings1
          storageAccountId: "[(await apim.get_storageaccount('cloud-shell-storage-eastus', 'cs2100320009ae43da8')).id]"
          metrics:
            - timeGrain: PT1M
              enabled: true
              retentionPolicy:
                days: 0
                enabled: true
          logs:
            - category: GatewayLogs
              enabled: true
              retentionPolicy:
                days: 0
                enabled: true
        namedValues:
          - id: expression
            displayName: expressionDisplay
            value: "@(DateTime.Now.ToString())"
            secret: false
            tags:
              - test
              - test2
          - id: expression2
            displayName: expression2Display
            value: "@(DateTime.Now.ToString())"
            secret: false
            tags:
              - test
              - test2
        groups:
          - id: "testGroup"
            displayName: "test group"
            description: "test group description"
            type: "custom"
        users:
          - id: john
            email: john@hotmail.com
            firstName: john
            lastName: smith
            groups:
              - testGroup
        products:
          - id: petstore-product
            displayName: My Petstore
            description: My Petstore Description
            terms: My terms
            subscriptionRequired: false
            state: published
            groups:
              - Administrators
              - Developers
              - testGroup
            policy:
              format: xml #we use a non-link format here to embed the policy, but this could have been xml-link and a http address
              value: <policies>
                        <inbound /> 
                        <backend>    
                          <forward-request /> 
                        </backend>  
                        <outbound>
                          <set-header name="X-Powered-By" exists-action="delete" />
                          <set-header name="X-AspNet-Version" exists-action="delete" />
                          <set-header name="CustomHeader" exists-action="override">
                            <value>{{expressionDisplay}}</value>
                          </set-header>
                        </outbound>
                      </policies>
            subscriptions:
              - id: petstore-subscription
                user: Administrator
        loggers:
          - appInsightsName: "[coreutils.variable('aiName')]"
            cleanKeys: true
            description: apimlogger
            loggerType: applicationInsights
            credentials: 
              instrumentationKey: "[coreutils.variable('aiKey')]"
        authServers:
          - id: auth
            displayName: authDisplay
            description: auth description
            clientRegistrationEndpoint: "https://login.microsoftonline.com/65d8323f-dcda-47dc-9506-32a61106ec9f/oauth2/authorize"
            authorizationEndpoint: "https://login.microsoftonline.com/65d8323f-dcda-47dc-9506-32a61106ec9f/oauth2/authorize"
            tokenEndpoint: "https://login.microsoftonline.com/65d8323f-dcda-47dc-9506-32a61106ec9f/oauth2/token"
            clientId: clientid
            clientSecret: clientSecret
            clientAuthenticationMethod:
              - Body
            authorizationMethods:
              - GET
            grantTypes:
              - implicit
        identityProviders:
          - id: microsoft
            clientId : testClientId
            clientSecret: testClientSecret
```