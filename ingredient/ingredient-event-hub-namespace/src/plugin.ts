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

            if (!params["diagnosticsEnabled"])
                params["diagnosticsEnabled"] = {"value": "yes"}

            if (params["diagnosticsEnabled"].value == "yes") {
                const ehnUtils = new EventHubNamespaceUtils(this._ctx);

                var diagnosticsEventHubNamespace = ehnUtils.get_resource_name("diagnostics");
                params["diagnosticsEventHubNamespace"] = {"value": diagnosticsEventHubNamespace};
              
                var diagnosticsEventHubNamespaceResourceGroup: string

                diagnosticsEventHubNamespaceResourceGroup = await util.resource_group("diagnostics");

                params["diagnosticsEventHubNamespaceResourceGroup"] = {"value": diagnosticsEventHubNamespaceResourceGroup};                
            }

            //await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())
            
            let alertTarget = params["eventHubNamespaceName"].value
            //await helper.DeployAlerts(this._name, alertParams, await util.resource_group(), metricTarget)
            let alertOverrides = this._ingredient.properties.alerts
            await helper.DeployAlerts(this._name, await util.resource_group(), alertTarget, stockAlerts, alertOverrides)

        } catch (error) {
            this._logger.error('deployment failed: ' + error)
            throw error
        }
    }
}