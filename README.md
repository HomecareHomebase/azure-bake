## Changelogs
* [@azbake/core](./core/CHANGELOG.md)
* [@azbake/system](./system/CHANGELOG.md)
* [@azbake/ingredient-arm](./ingredient/ingredient-arm/CHANGELOG.md)
* [@azbake/ingredient-apim](./ingredient/ingredient-apim/CHANGELOG.md)
* [@azbake/ingredient-apim-api](./ingredient/ingredient-apim-api/CHANGELOG.md)
* [@azbake/ingredient-script](./ingredient/ingredient-script/CHANGELOG.md)
* [@azbake/ingredient-utils](./ingredient/ingredient-utils/CHANGELOG.md)
* [@azbake/ingredient-webapp-container](./ingredient/ingredient-webapp-container/CHANGELOG.md)
* [@azbake/ingredient-traffic-manager](./ingredient/ingredient-traffic-manager/CHANGELOG.md)
* [@azbake/ingredient-host-names](./ingredient/ingredient-host-names/CHANGELOG.md)
* [@azbake/ingredient-service-bus-namespace](./ingredient/ingredient-service-bus-namespace/CHANGELOG.md)
* [@azbake/ingredient-databricks](./ingredient/ingredient-databricks/CHANGELOG.md)
* [@azbake/ingredient-datafactoryv2](./ingredient/ingredient-datafactoryv2/CHANGELOG.md)
* [@azbake/ingredient-sql-dwh](./ingredient/ingredient-sql-dwh/CHANGELOG.md)
* [@azbake/ingredient-sqldb](./ingredient/ingredient-sqldb/CHANGELOG.md)
* [@azbake/ingredient-sqlserver-logical](./ingredient/ingredient-sqlserver-logical/CHANGELOG.md)
* [@azbake/ingredient-cosmosdb](./ingredient/ingredient-cosmosdb/CHANGELOG.md)

## Tools
[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lernajs.io/)

[![Generic badge](https://img.shields.io/badge/Azure-Cloud-Blue.svg)](https://shields.io/)

## Build

**_Build Commands_ to be executed from the project root**

For Clean Build with Local and External Dependency Loading: `npm run clean:build`
For Build with Local and External Dependency Loading:       `npm run load:build`
For Build Only:                                             `npm run build`

## Development Testing

After a _Lerna_ `clean:build` navigate to `system/dist` and run `node index.js` and append your bake commands including `mix --name "my_deployment:latest" --runtime "latest" ./package/test.yaml`. All dependencies should be linked through _Lerna_ as long as they have been properly setup and run through the build process.

## Install
```
npm i -g azure-bake
```

## Overview

Bake is an Azure deployment tool & system designed to treat both infrastructure as code and also package built software artifacts alongside that infrastructure. This bundling allows for rapid and agile usage of infrastructure as needed by software changes.

This system is not intended as a replacement for popular/standard pipeline systems for deployment, but instead to work within them as a task runner.

For the moment we have native support for Azure DevOps pipelines (build and deploy) to both generate bake recipes at build time (create pipeline build artifacts) and then deploy those recipes via release pipelines.

We also support bake at the command line via the provided CLI. With that, you can integrate with most popular pipeline products

### Recipe & Ingredients

A bake recipe is a YAML document that describes what should be deployed. This is described as a list of bake ingredients.

Bake ingredients are external plugins that provide deployment functionality for a recipe. This includes ingredients that deploy azure ARM templates, or execute custom javascript/typescript, or more managed ingredients that automate the deployment of common resources like storage, cosmosDB, etc. Bake provides a set of ingredients for usage, and 3rd party ingredients can be included as well.

Once you mix a bake recipe a docker image is generated that includes everything needed to deploy your recipe. This docker recipe package is then uploaded into a docker repositry for later deployment. Bake recipe packages are tagged so that different versions can be deployed as needed.


## Usage

### Mix / Create a deploment recipe
```bash
bake mix --name "my_deployment:latest" --runtime "latest" ./package/bake.yaml
```

- name : name of the local docker image:tag that will get generated
- runtime: which version of the bake runtime to build a package against.
  - "latest" will be against the latest runtime version at mix time, once built the version will not change.
  - Check the docker hub for all runtime versions: [bake tags](https://hub.docker.com/r/homecarehomebase/bake/tags)

### Serve / Deploy a recipe
```bash
bake serve "mydocker/myrecipe:0.0.1"
```
Serve takes in a docker image tag to deploy. This should map to a docker image (local or remote) that was mixed with bake.

Note: There are several environment variables for azure authentication and environment selection that need to be set before you can serve a recipe:

| Environment name | Description |
| ----------------- | ----------- |
| BAKE_AUTH_SUBSCRIPTION_ID | Azure subscription ID to deploy recipes into|
| BAKE_AUTH_SERVICE_ID | Azure Service Principle user ID with correct ACLs for your deployment needs |
| BAKE_AUTH_SERVICE_KEY | Secret key for the service principle |
| BAKE_AUTH_TENANT_ID | Azure Active Directory tenant id/name for your deployment service princple|
| BAKE_ENV_NAME | Full name of the environment this deployment is for |
| BAKE_ENV_CODE | 4 letter environment code, used for naming of resources/resource groups|
| BAKE_ENV_REGIONS | JSON array of region objects that the recipe should deploy to |
| BAKE_VARIABLES | Path to YAML file of bake variables that the recipe can access |
| BAKE_LOG_LEVEL | Log levels include debug, info (default if unspecified), warn, and error |

*note: read the section on Environment for a deeper explanation of environment/regions/variables*

## Bake YAML schema
At the core of a recipe is the bake.yaml file which drives the deployment of all included recipes. The schema documentation can be found [here](./Schema.md)

## Bake Environment Structure/Terms

Bake uses the concept of an "**environment**" as a virtual grouping of deployment resources. An environment has to deploy into an Azure subscription, but you can deploy multiple environments into the same subscription.

To setup an environment you must define a few items:

* **BAKE_ENV_NAME**:  This is the descriptive name of your environment. This is used in logging, tagging, and other areas where allowed.
* **BAKE_ENV_CODE**: This is a 4 letter code, and must be unique across all your environments (even subscriptions). Some azure resource names are global, and this code helps generate a unique key for your resource
* **BAKE_ENV_REGIONS**: This is a JSON array object of regions structures. Bake requires at least one azure region to deploy, and will deploy into all regions supplied. *note: bake deploys resources to regions in parallel by default, but can be turned off per recipe if seqential is required*

**region structure**
```json
{
    "name":"East US",
    "code":"eus",
    "shortName":"eastus"
}
```
* Name from: [Azure published regions]
(https://azure.microsoft.com/en-us/global-infrastructure/locations)
* code: 3/4 letter code to describe the region (used for naming resources)
* shortName: the azure region location identifier for the Azure management API.
    * You can get this from the powershell: Get-AzureRMLocation | Format-Table

```bash
# setting regions to both east and west US
set BAKE_ENV_REGIONS='[{"name":"East US","code":"eus","shortName":"eastus"},{"name":"West US","code":"wus","shortName":"westus"}]'
```
* BAKE_VARIABLES: Path to YAML file of name/value pair variables that the recipe can access. These are typically used as environment wide/specific settings to configure recipes per environment (i.e. enviroment specific secret keys, etc.)

**YAML structure**
```yaml
storage_key: "secret"
env_type: "prod"
```

```bash
set BAKE_VARIABLES='/path/to/your/envVars.yml'
```

### Azure resource groups
Within a bake environment each deployed recipe will generate a resource group for the resources within the recipe to deploy. A recipe can turn off resource group deployment, if for instance the recipe contains only deployed software and not infrastructure.

A recipe can also override the resource group it should deploy into, instead of generating a group name based on the env-region-recipe_name. This is a very advanced feature however, and will probably require an expression to build up the name at least based on environment name and possibly region.


### Azure infrastructure resources

When bake deploys an azure resource, the name of the resource should be stable so that redeploying the recipe will generate the same resource name. This is true for all bake created ingredients (@azbake/ingredient-*). For resource names to be stable a resource id is generated based on the env_code, region_code, and recipe short name.

## How to develop custom ingredients

Custom ingredients can be developed by following this [guide](./ingredient-template/README.md), and then publishing them to either an internal or external npm package repository.

## Bake supplied Ingredients

### @azbake/ingredient-arm

Simple ingredient that allows deploying Azure ARM json templates. Parameters are supplied via native bake ingredient parameters

[read more](./ingredient/ingredient-arm/README.md)

### @azbake/ingredient-apim

The APIM ingredient allows for easy standup of an APIM resource including modification of Products, Subscriptions and more.

[read more](./ingredient/ingredient-apim/README.md)

### @azbake/ingredient-apim-api

The APIM API ingredient allows for easy registration & modification of APIs within an Azure APIM resource.

[read more](./ingredient/ingredient-apim-api/README.md)

### @azbake/ingredient-app-service-plan
Ingredient that allows deploying App Service Plan. Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-app-service-plan/README.md)

### @azbake/ingredient-databricks
Ingredient that allows deploying Databricks. Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-databricks/README.md)

### @azbake/ingredient-datafactoryv2
Ingredient that allows deploying Azure Data Factory. Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-datafactoryv2/README.md)

### @azbake/ingredient-host-names
Ingredient that allows deploying custom host names and ssl certificates to Azure Web Sites.  Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-host-names/README.md)

### @azbake/ingredient-postgresql
Ingredient that allows deploying Azure Database for PostgreSQL servers. Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-postgresql/README.md)

### @azbake/ingredient-script
Simple ingredient that allows executing javascript/typescript functions. Parameters are avalible inside the function, as well as the full bake deployment context. Useful for implementing edge case deployment needs, or stop gap before an external ingredient supports.

[read more](./ingredient/ingredient-arm/README.md)

### @azbake/ingredient-service-bus-namespace
Ingredient that allows deploying Service Bus Namespace. Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-service-bus-namespace/README.md)

### @azbake/ingredient-sql-dwh
Ingredient that allows deploying SQL Data Warehouse. Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-sql-dwhj/README.md)

### @azbake/ingredient-sqldb
Ingredient that allows deploying SQL Database. Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-sqldb/README.md)

### @azbake/ingredient-sqlserver-logical
Ingredient that allows deploying SQL Server Logical. Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-sqlserver-logical/README.md)

### @azbake/ingredient-traffic-manager
Ingredient that allows deploying Azure Traffic Manager profile and endpoints for each region.  Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-traffic-manager/README.md)

### @azbake/ingredient-utils
Ingredient provides all core expression methods, and helpers for current bake context, azure resources. For example:
   * Get current region object - useful inside an ingredient param to know current location
   * Create resource name: Generate a proper resource name for the current context (region, subscription, env, etc.)
   * [read more](./ingredient/ingredient-arm/README.md)

### @azbake/ingredient-webapp-container
Ingredient that allows deploying Azure Web Apps for Containers.  Parameters are supplied via native bake ingredient parameters.

[read more](./ingredient/ingredient-webapp-container/README.md)
