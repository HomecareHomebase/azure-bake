import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"

export class AppInsightsPlugIn extends BaseIngredient {
    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Custom Plugin Logging: ' + this._ingredient.properties.source)
            
            const helper = new ARMHelper(this._ctx);
            
            let params = helper.BakeParamsToARMParams(this._name, this._ingredient.properties.parameters)
            
            await helper.DeployTemplate(this._name, ARMTemplate, params, util.resource_group())
            
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}
