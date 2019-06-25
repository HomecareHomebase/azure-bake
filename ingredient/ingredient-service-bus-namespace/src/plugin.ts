import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"
import { EventHubNamespaceUtils } from "@azbake/ingredient-event-hub-namespace"

export class ServiceBusNamespace extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Service Bus Namespace Plugin Logging: ' + this._ingredient.properties.source)

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
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}