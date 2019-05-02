import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import staticAlertARMTemplate from "./staticAlert.json"
import dynamicAlertARMTemplate from "./dynamicAlert.json"

export class MetricAlertPlugin extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Metric Alert Plugin Logging: ' + this._ingredient.properties.source)

            const helper = new ARMHelper(this._ctx);

            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            await helper.DeployTemplate(this._name, staticAlertARMTemplate, params, await util.resource_group())

        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}