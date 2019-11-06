# Quick Start: Create a new ingredient that deploys an ARM template

In this quickstart, you setup your development environment and create a new ingredient that deploys an ARM template.

1. Clone the Azure Bake repo if you haven't already.
2. Copy the ingredient-template folder as a subfolder of the ingredient folder.
3. Rename the copied folder using your new ingredient name.
4. Create a new arm.json file.
5. Define your ARM template within the arm.json file.
6. Modify plugin.ts to deploy the ARM template.  Change MyCustomPlugIn name to reflect the name of your ingredient.  ie. AppInsightsPlugIn.

```js
import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"
	
export class MyCustomPlugin extends BaseIngredient {
    public async Execute(): Promise<void> {
		try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Custom Plugin Logging: ' + this._ingredient.properties.source)
            
            const helper = new ARMHelper(this._ctx);
            
            let params:any={}
            params["parameterName1"]="parameterValue1"
            params["parameterName2"]="parameterValue2"
            await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
            
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}
```

7. Edit package.json in your ingredient folder
   - Set the name, description, version number, and author for your ingredient.  
```json
"name": "@azbake/ingredient-app-insights",
"description": "Ingredient for deploying an instance of an Application Insights resource",
"version": "0.0.1",
…
"author": "HCHB",
```
8. Move /src/tsconfig.json to the parent directory (your ingredient's directory).
9. Modify tsconfig.json's compiler options to reflect the directory change for outDir and add two additional compiler options.
```json
"outDir": "./dist",
..
"resolveJsonModule": true,
"esModuleInterop": true
```

10. Modify index.ts
	- Replace MyCustomPlugIn with the plug-in used in plugin.ts
	- Replace the plugin namespace to be the same name used in package.json.  Example - 
```ts
exports.pluginNS = "@azbake/ingredient-app-insights"
```
11. Open a terminal window
12. Navigate to your new ingredient's directory.
13. Get the latest Azure Bake packages
```bash
npm i @azbake/core --no-save
npm i @azbake/arm-helper --nosave
```
14. Compile your new ingredient 
```
tsc
```
15. Package your ingredient
```bash
npm pack
```

## Next Steps
In this quick start, you created a simple ingredient that deploys an ARM template and configured your development environment.  As a next step, try using your ingredient in a recipe and deploying to Azure (quick start coming soon).