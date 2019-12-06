import { BaseIngredient, IngredientManager, BakeVariable } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"
import stockAlerts from "./stockAlerts.json"
import { EventHubNamespaceUtils } from "./functions.js";
import { stringify } from "querystring";

export class EventHubNamespacePlugin extends BaseIngredient {
    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Event Hub Namespace Plugin Logging: ')

            const helper = new ARMHelper(this._ctx);
                                
            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)

            params = await helper.ConfigureDiagnostics(params);

            await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
            
            let alertTarget = params["eventHubNamespaceName"].value
            let alertOverrides = this._ingredient.properties.alerts
            await helper.DeployAlerts(this._name, await util.resource_group(), alertTarget, stockAlerts, alertOverrides)

        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}