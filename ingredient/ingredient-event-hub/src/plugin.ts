import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"

export class EventHubPlugin extends BaseIngredient {
    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Event Hub Plugin Logging: ' + await this._ingredient.properties.source.valueAsync(this._ctx))

            const helper = new ARMHelper(this._ctx);
            
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            
            let ehnRG: string

            if (params["eventHubNamespaceResourceGroup"]) {
                ehnRG = params["eventHubNamespaceResourceGroup"].value
                delete params["eventHubNamespaceResourceGroup"]
            }
            else
            {
                ehnRG = await util.resource_group()
            }            

            await helper.DeployTemplate(this._name, ARMTemplate, params, ehnRG)

        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}