import { BaseIngredient, IngredientManager, IIngredient, DeploymentContext } from "@azbake/core"
import type { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"

export class EventHubPlugin extends BaseIngredient {
    constructor(name: string, ingredient: IIngredient, ctx: DeploymentContext) {
        super(name, ingredient, ctx);
    }
    
    _helper?: ARMHelper;

    private getHelper(): ARMHelper {
        if (!this._helper) {
            const { ARMHelper } = require("@azbake/arm-helper");
            this._helper = new ARMHelper(this._ctx);
        }
        return this._helper!;
    }

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Event Hub Plugin Logging: ' + await this._ingredient.properties.source.valueAsync(this._ctx))

            const helper = this.getHelper();
            
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
