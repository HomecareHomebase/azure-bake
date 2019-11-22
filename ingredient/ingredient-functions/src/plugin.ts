import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"
	
export class FunctionsPlugin extends BaseIngredient {
    public async Execute(): Promise<void> {
		try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('FunctionsPlugin - Logging: ' + this._ingredient.properties.source)
            
            const helper = new ARMHelper(this._ctx);
            
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            
            let resourceGroup = params["funcAppResourceGroup"] ? params["funcAppResourceGroup"].value : ( await util.resource_group() );

            params["funcAppResourceGroup"] = { value: resourceGroup };

            await helper.DeployTemplate(this._name, ARMTemplate, params, resourceGroup)
            
        } catch(error){
            this._logger.error('FunctionsPlugin - Logging: deployment failed: ' + error)
            throw error
        }
    }
}