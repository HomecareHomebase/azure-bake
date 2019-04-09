## Changelogs
* [@azbake/arm-helper](./CHANGELOG.md)

## Overview

ARM Helper is a utility plugin for Bake that can be used by ingredients to easily deploy ARM templates.

## Usage

To use, install the utility as a dependency for your ingredient.

```bash
  npm i @azbake/arm-helper
```

## ARMHelper class

Class for deploying ARM templates and transforming bake parameters into ARM template parameters.

### Constructors

ARMHelper(context)

### Functions

|function|description|
|--------|-----------|
|DeployTemplate(deploymentName, template, params, resourceGroup)| Deploys the specified ARM template with the specified parameters.|
|BakeParamsToARMParams(deploymentName, params)| Converts bake parameters to the format expected by ARM for ARM parameters.|

### Constructor Details

#### ARMHelper(context)

```typescript
new ARMHelper(context)
```

##### Parameters
|parameter|type|required|description|
|---------|----|--------|-----------|
|``context``|DeploymentContext|yes|The current bake deployment context|

### Function Details

#### DeployTemplate(deploymentName, template, params, resourceGroup)

Deploys the specified ARM template with the specified parameters to the specified resourceGroup.  This is a long running function and should be used with the ``await`` operator.

```typescript
public async DeployTemplate(deploymentName, template, params, resourceGroup)
```

##### Parameters
|parameter|type|required|description|
|---------|----|--------|-----------|
|``deploymentName``|string|yes|Name of the deployment for Azure.|
|``template``|any|yes|JSON object representing the arm template|
|``params``|any|yes|JSON object representing parameters used in the ARM template|
|``resourceGroup``|string|yes|Name of the resource group the ARM template will deploy into|

##### Returns
``Promise<void>``

#### BakeParamsToARMParams(deploymentName, params)

Reads the Bake parameters and converts them into values acceptable for parameters of ARM templates.

```typescript
public BakeParamsToARMParams(deploymentName, params)
```

##### Parameters
|parameter|type|required|description|
|---------|----|--------|-----------|
|``deploymentName``|string|yes|Name of the azure deployment|
|``params``|``Map<string, BakeVariable>``|yes|The parameters passed into the ingredient|

##### Returns
``any``

JSON object of parameters to load into the ARM template during deployment.







## Example

```typescript
import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import arm from "./arm.json"

export class MyIngredient extends BaseIngredient {

  public async Execute(): Promise<void> {

    const util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
    const helper = new ARMHelper(this._ctx)

    const parameters = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

    await helper.DeployTemplate(this._name, arm, parameters, await util.resource_group())
  }
}

```