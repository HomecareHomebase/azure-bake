import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"
import { EventHubNamespaceUtils } from "./functions.js";

export class EventHubNamespacePlugin extends BaseIngredient {
    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Event Hub Namespace Plugin Logging: ')

            const helper = new ARMHelper(this._ctx);

            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            if (!params["diagnosticsEnabled"])
                params["diagnosticsEnabled"] = {"value": "yes"}

            if (params["diagnosticsEnabled"].value == "yes") {
                const ehnUtils = new EventHubNamespaceUtils(this._ctx);

                var diagnosticsEventHubNamespace = ehnUtils.get_resource_name("diagnostics");
                params["diagnosticsEventHubNamespace"] = {"value": diagnosticsEventHubNamespace};
              
                var diagnosticsEventHubResourceGroup: string

                diagnosticsEventHubResourceGroup = await ehnUtils.get_resource_group();

                params["diagnosticsEventHubResourceGroup"] = {"value": diagnosticsEventHubResourceGroup};                
            }

            await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())

        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}