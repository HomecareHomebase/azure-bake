# Quickstart: Create a new ingredient that deploys an ARM template

In this quickstart, you setup your development environment and create a new ingredient that deploys an ARM template.

1. Clone the Azure Bake repo if you haven't already.
2. Copy the ingredient-template folder as a subfolder of the ingredient folder.
3. Rename the copied folder using your new ingredient name.
4. Create a new arm.json file.
5. Define your ARM template within the arm.json file.
   - Start with a base ARM template using one of two ways.
      - Export a specific deployment of a template.  ie [az group export](https://docs.microsoft.com/en-us/cli/azure/group?view=azure-cli-latest#az-group-export), etc.
      - Export a gnerated template.  ie [az group deployment export](https://docs.microsoft.com/en-us/cli/azure/group/deployment?view=azure-cli-latest#az-group-deployment-export)
6. Modify plugin.ts to deploy the ARM template.  Change MyCustomPlugIn name to reflect the name of your ingredient.  ie. AppInsightsPlugIn.

```
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
            await helper.DeployTemplate(this._name, ARMTemplate, params, util.resource_group())
            
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}
```

7. Edit package.json in your ingredient folder
   - Set the name, description, version number, and author for your ingredient.  
```
"name": "@azbake/ingredient-app-insights",
"description": "Ingredient for deploying an instance of an Application Insights resource",
"version": "0.0.1",
…
"author": "HCHB",

```
8. Move /src/tsconfig.json to the parent directory (your ingredient's directory).
9. Modify tsconfig.json's compiler options to reflect the directory change for outDir and add two additional compiler options.
```
"outDir": "./dist",
..
"resolveJsonModule": true,
"esModuleInterop": true
```

10. Modify index.ts
	- Replace MyCustomPlugIn with the plug-in used in plugin.ts
	- Replace the plugin namespace to be the same name used in package.json.  Example - 
```
exports.pluginNS = "@azbake/ingredient-app-insights"
```
11. Open a terminal window
12. Navigate to your new ingredient's directory.
13. Get the latest Azure Bake packages
    - Run _npm i @azbake/core --no-save_
	- Run _npm i @azbake/arm-helper --nosave_
14. Compile your new ingredient by running _tsc_
15. Run _npm pack_ to package your ingredient
    