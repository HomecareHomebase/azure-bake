
import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./search.json"

const path = require("path")

export class SearchPlugIn extends BaseIngredient {
    
    private resourceGroup: string = ""

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log("Search ingredient logging");
            
            const helper = new ARMHelper(this._ctx);
            
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            
            // define resource group and check rgOverride 
            let rgOverrideParam  = this._ingredient.properties.parameters.get('rgOverride')
            if (rgOverrideParam) {
                this.resourceGroup = await rgOverrideParam.valueAsync(this._ctx)
                // remove rgOverride if it exists since its not in the ARM template
                delete params["rgOverride"]
            }
            else {
                this.resourceGroup = await util.resource_group();
            }

            await helper.DeployTemplate(this._name, ARMTemplate, params, this.resourceGroup)

        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}