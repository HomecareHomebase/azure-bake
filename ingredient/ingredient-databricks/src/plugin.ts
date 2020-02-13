import { BaseIngredient, IngredientManager } from "@azbake/core"
import { ARMHelper } from "@azbake/arm-helper"
import ARMTemplate from "./arm.json"
export class DataBricks extends BaseIngredient {

    public async Execute(): Promise<void> {
        try {
            let util = IngredientManager.getIngredientFunction("coreutils", this._ctx)
            this._logger.log('Logical SQL Server Plugin Logging: ' + this._ingredient.properties.source)

            const helper = new ARMHelper(this._ctx);

            let params = await helper.BakeParamsToARMParamsAsync(this._name, this._ingredient.properties.parameters)
            
            if (!params["diagnosticsEnabled"])
            params["diagnosticsEnabled"] = {"value": "yes"}

            if (params["diagnosticsEnabled"].value === "yes") {
                const ehnUtils = IngredientManager.getIngredientFunction("eventhubnamespace", this._ctx)

                var diagnosticsEventHubNamespace = ehnUtils.get_resource_name("diagnostics");
                params["diagnosticsEventHubNamespace"] = {"value": diagnosticsEventHubNamespace};
              
                var diagnosticsEventHubNamespaceResourceGroup: string

                diagnosticsEventHubNamespaceResourceGroup = await util.resource_group("diagnostics");

                params["diagnosticsEventHubResourceGroup"] = {"value": diagnosticsEventHubNamespaceResourceGroup};   

                this._logger.log('diagnosticsEventHubNamespace: ' + diagnosticsEventHubNamespace)
                this._logger.log('diagnosticsEventHubNamespaceResourceGroup: ' + diagnosticsEventHubNamespaceResourceGroup)
            }
            
            await helper.DeployTemplate(this._name, ARMTemplate, params, await util.resource_group())            
                        
        } catch(error){
            this._logger.error('deployment failed: ' + error)
            throw error

        }
    }
}